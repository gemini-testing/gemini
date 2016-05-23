'use strict';
const q = require('q');
const Pool = require('../../../lib/browser-pool/caching-pool');
const browserWithId = require('../../util').browserWithId;

describe('CachingPool', function() {
    const sandbox = sinon.sandbox.create();
    let underlyingPool;

    function makeStubBrowser(id) {
        const browser = sandbox.stub(browserWithId(id));
        browser.launch.returns(q());
        browser.reset.returns(q());
        return browser;
    }

    function poolWithReuseLimits(limits) {
        const config = {
            getBrowserIds: sandbox.stub().returns(Object.keys(limits)),
            forBrowser: (id) => ({
                id,
                suitesPerSession: limits[id],
                desiredCapabilities: {}
            })
        };
        return new Pool(config, underlyingPool);
    }

    function makePool() {
        return poolWithReuseLimits({id: Infinity});
    }

    beforeEach(() => {
        underlyingPool = {
            getBrowser: sandbox.stub(),
            freeBrowser: sandbox.stub().returns(q()),
            finalizeBrowsers: sandbox.stub().returns(q())
        };
    });

    afterEach(() => sandbox.restore());

    it('should create new browser when requested first time', () => {
        underlyingPool.getBrowser.returns(q(makeStubBrowser('id')));

        return makePool().getBrowser('id')
            .then(() => assert.calledWith(underlyingPool.getBrowser, 'id'));
    });

    it('should return same browser as returned by underlying pool', () => {
        const browser = makeStubBrowser('id');
        underlyingPool.getBrowser.returns(q(browser));

        return assert.eventually.equal(makePool().getBrowser('id'), browser);
    });

    it('should not reset the new browser', () => {
        const browser = makeStubBrowser('id');
        underlyingPool.getBrowser.returns(q(browser));

        return makePool().getBrowser('id')
            .then(() => assert.notCalled(browser.reset));
    });

    it('should create and launch new browser if there is free browser with different id', () => {
        underlyingPool.getBrowser
            .withArgs('first').returns(q(makeStubBrowser('first')))
            .withArgs('second').returns(q(makeStubBrowser('second')));

        const pool = poolWithReuseLimits({
            first: 1,
            second: 1
        });
        return pool.getBrowser('first')
            .then((browser) => pool.freeBrowser(browser))
            .then(() => pool.getBrowser('second'))
            .then(() => assert.calledWith(underlyingPool.getBrowser, 'second'));
    });

    it('should not quit browser when freed', () => {
        const pool = makePool();
        underlyingPool.getBrowser.returns(q(makeStubBrowser('id')));

        return pool.getBrowser('id')
            .then((browser) => pool.freeBrowser(browser, {noMoreRequests: false}))
            .then(() => assert.notCalled(underlyingPool.freeBrowser));
    });

    it('should quit browser when there are no more requests', () => {
        const pool = makePool();
        underlyingPool.getBrowser.returns(q(makeStubBrowser('id')));

        return pool.getBrowser('id')
            .then((browser) => pool.freeBrowser(browser, {noMoreRequests: true}))
            .then(() => assert.calledOnce(underlyingPool.freeBrowser));
    });

    describe('when there is free browser with same id', () => {
        let browser;
        let pool;

        beforeEach(() => {
            browser = makeStubBrowser('id');
            pool = makePool();
            return pool.freeBrowser(browser);
        });

        it('should not create second instance', () => {
            return pool.getBrowser('id')
                .then(() => assert.notCalled(underlyingPool.getBrowser));
        });

        it('should reset the browser', () => {
            return pool.getBrowser('id')
                .then(() => assert.calledOnce(browser.reset));
        });

        describe('when reset failed', () => {
            it('should fail to get browser', () => {
                browser.reset.returns(q.reject('some-error'));
                return assert.isRejected(pool.getBrowser('id'), /some-error/);
            });

            it('should put browser back', () => {
                browser.reset.returns(q.reject());

                return pool.getBrowser('id')
                    .catch(() => {
                        assert.calledOnce(underlyingPool.freeBrowser);
                        assert.calledWith(underlyingPool.freeBrowser, browser);
                    });
            });

            it('should keep original error if failed to put browser back', () => {
                browser.reset.returns(q.reject('reset-error'));
                underlyingPool.freeBrowser.returns(q.reject('free-error'));

                return assert.isRejected(pool.getBrowser('id'), /reset-error/);
            });
        });

        it('should free cached instance when browser finished', () => {
            return pool.finalizeBrowsers('id')
                .then(() => assert.calledOnce(underlyingPool.freeBrowser));
        });

        it('should clear existing browser when browser finished', () => {
            const anotherBrowser = makeStubBrowser('id');

            underlyingPool.getBrowser
                .onFirstCall().returns(q(anotherBrowser));

            return pool.finalizeBrowsers('id') //this.browser already added to pool in beforeEach
                .then(() => pool.getBrowser('id'))
                .then((browser) => assert.deepEqual(browser, anotherBrowser));
        });

        it('should call finalize on underlying pool when browser finished', () => {
            return pool.finalizeBrowsers('id')
                .then(() => assert.calledWith(underlyingPool.finalizeBrowsers));
        });
    });

    describe('when there are multiple browsers with same id', () => {
        let firstBrowser;
        let secondBrowser;
        let pool;

        beforeEach(function() {
            firstBrowser = makeStubBrowser('id');
            secondBrowser = makeStubBrowser('id');
            pool = makePool();
            return q.all([
                pool.freeBrowser(firstBrowser),
                pool.freeBrowser(secondBrowser)
            ]);
        });

        it('should return last browser in cache on first getBrowser', () => {
            return assert.becomes(pool.getBrowser('id'), secondBrowser);
        });

        it('should return first browser on second getBrowser', () => {
            return pool.getBrowser('id')
                .then(() => assert.becomes(pool.getBrowser('id'), firstBrowser));
        });

        it('should launch new session when there are no free browsers left', () => {
            return pool.getBrowser('id')
                .then(() => pool.getBrowser('id'))
                .then(() => pool.getBrowser('id'))
                .then(() => assert.calledWith(underlyingPool.getBrowser, 'id'));
        });
    });

    describe('when there is reuse limit', () => {
        function launchAndFree(pool, id) {
            return pool.getBrowser(id)
                .then((browser) => pool.freeBrowser(browser));
        }

        it('should launch only one session within the reuse limit', () => {
            underlyingPool.getBrowser.returns(q(makeStubBrowser('id')));
            const pool = poolWithReuseLimits({id: 2});

            return launchAndFree(pool, 'id')
                .then(() => pool.getBrowser('id'))
                .then(() => assert.calledOnce(underlyingPool.getBrowser));
        });

        it('should launch next session when over reuse limit', () => {
            underlyingPool.getBrowser
                .onFirstCall().returns(q(makeStubBrowser('id')))
                .onSecondCall().returns(q(makeStubBrowser('id')));
            const pool = poolWithReuseLimits({id: 2});

            return launchAndFree(pool, 'id')
                .then(() => launchAndFree(pool, 'id'))
                .then(() => pool.getBrowser('id'))
                .then(() => assert.calledTwice(underlyingPool.getBrowser));
        });

        it('should close old session when reached reuse limit', () => {
            const browser = makeStubBrowser('id');
            const pool = poolWithReuseLimits({id: 2});

            underlyingPool.getBrowser.returns(q(browser));

            return launchAndFree(pool, 'id')
                .then(() => launchAndFree(pool, 'id'))
                .then(() => assert.calledWith(underlyingPool.freeBrowser, browser));
        });

        it('should cache browser with different id even if the first one is over limit', () => {
            underlyingPool.getBrowser
                .withArgs('first').returns(q(makeStubBrowser('first')));

            const createSecondBrowser = underlyingPool.getBrowser.withArgs('second');
            const pool = poolWithReuseLimits({
                first: 2,
                second: 2
            });

            createSecondBrowser.returns(q(makeStubBrowser('second')));

            return launchAndFree(pool, 'first')
                .then(() => launchAndFree(pool, 'second'))
                .then(() => launchAndFree(pool, 'first'))
                .then(() => pool.getBrowser('second'))
                .then(() => assert.calledOnce(createSecondBrowser));
        });
    });
});
