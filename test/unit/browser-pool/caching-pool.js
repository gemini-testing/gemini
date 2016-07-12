'use strict';
const q = require('q');
const Pool = require('lib/browser-pool/caching-pool');
const browserWithId = require('../../util').browserWithId;

describe('CachingPool', () => {
    const makeStubBrowser = (id) => {
        const browser = sinon.stub(browserWithId(id));
        browser.launch.returns(q());
        browser.reset.returns(q());
        return browser;
    };

    beforeEach(() => {
        this.underlyingPool = {
            getBrowser: sinon.stub(),
            freeBrowser: sinon.stub().returns(q()),
            finalizeBrowsers: sinon.stub().returns(q())
        };

        this.poolWithReuseLimits = (limits) => {
            const config = {
                getBrowserIds: sinon.stub().returns(Object.keys(limits)),
                forBrowser: (id) => {
                    return {
                        id,
                        suitesPerSession: limits[id],
                        desiredCapabilities: {}
                    };
                }
            };
            return new Pool(config, this.underlyingPool);
        };

        this.makePool = () => this.poolWithReuseLimits({id: Infinity});

        this.sinon = sinon.sandbox.create();
    });

    afterEach(() => this.sinon.restore());

    it('should create new browser when requested first time', () => {
        this.underlyingPool.getBrowser.returns(q(makeStubBrowser('id')));
        const pool = this.makePool();
        return pool.getBrowser('id')
            .then(() => assert.calledWith(this.underlyingPool.getBrowser, 'id'));
    });

    it('should return same browser as returned by underlying pool', () => {
        const browser = makeStubBrowser('id');
        this.underlyingPool.getBrowser.returns(q(browser));
        const pool = this.makePool();
        return assert.eventually.equal(pool.getBrowser('id'), browser);
    });

    it('should not reset the new browser', () => {
        const browser = makeStubBrowser('id');
        this.underlyingPool.getBrowser.returns(q(browser));
        return this.makePool().getBrowser('id')
            .then(() => assert.notCalled(browser.reset));
    });

    it('should create and launch new browser if there is free browser with different id', () => {
        this.underlyingPool.getBrowser
            .withArgs('first').returns(q(makeStubBrowser('first')))
            .withArgs('second').returns(q(makeStubBrowser('second')));
        const pool = this.poolWithReuseLimits({
            first: 1,
            second: 1
        });
        return pool.getBrowser('first')
            .then((browser) => pool.freeBrowser(browser))
            .then(() => pool.getBrowser('second'))
            .then(() => assert.calledWith(this.underlyingPool.getBrowser, 'second'));
    });

    it('should not quit browser when freed', () => {
        const pool = this.makePool();
        this.underlyingPool.getBrowser.returns(q(makeStubBrowser('id')));

        return pool.getBrowser('id')
            .then((browser) => pool.freeBrowser(browser, {noMoreRequests: false}))
            .then(() => assert.notCalled(this.underlyingPool.freeBrowser));
    });

    it('should quit browser when there are no more requests', () => {
        const pool = this.makePool();
        this.underlyingPool.getBrowser.returns(q(makeStubBrowser('id')));

        return pool.getBrowser('id')
            .then((browser) => pool.freeBrowser(browser, {noMoreRequests: true}))
            .then(() => assert.calledOnce(this.underlyingPool.freeBrowser));
    });

    describe('when there is free browser with same id', () => {
        beforeEach(() => {
            this.browser = makeStubBrowser('id');
            this.pool = this.makePool();
            return this.pool.freeBrowser(this.browser);
        });

        it('should not create second instance', () => {
            return this.pool.getBrowser('id')
                .then(() => assert.notCalled(this.underlyingPool.getBrowser));
        });

        it('should reset the browser', () => {
            return this.pool.getBrowser('id')
                .then(() => assert.calledOnce(this.browser.reset));
        });

        describe('when reset failed', () => {
            it('should fail to get browser', () => {
                this.browser.reset.returns(q.reject('some-error'));
                return assert.isRejected(this.pool.getBrowser('id'), /some-error/);
            });

            it('should put browser back', () => {
                this.browser.reset.returns(q.reject());

                return this.pool.getBrowser('id')
                    .fail(() => {
                        assert.calledOnce(this.underlyingPool.freeBrowser);
                        assert.calledWith(this.underlyingPool.freeBrowser, this.browser);
                    });
            });

            it('should keep original error if failed to put browser back', () => {
                this.browser.reset.returns(q.reject('reset-error'));
                this.underlyingPool.freeBrowser.returns(q.reject('free-error'));

                return assert.isRejected(this.pool.getBrowser('id'), /reset-error/);
            });
        });
    });

    describe('when there are multiple browsers with same id', () => {
        beforeEach(() => {
            this.firstBrowser = makeStubBrowser('id');
            this.secondBrowser = makeStubBrowser('id');
            this.pool = this.makePool();
            return q.all([
                this.pool.freeBrowser(this.firstBrowser),
                this.pool.freeBrowser(this.secondBrowser)
            ]);
        });

        it('should return last browser in cache on first getBrowser', () => {
            return assert.becomes(this.pool.getBrowser('id'), this.secondBrowser);
        });

        it('should return first browser on second getBrowser', () => {
            return this.pool.getBrowser('id')
                .then(() => assert.becomes(this.pool.getBrowser('id'), this.firstBrowser));
        });

        it('should launch new session when there are no free browsers left', () => {
            return this.pool.getBrowser('id')
                .then(() => this.pool.getBrowser('id'))
                .then(() => this.pool.getBrowser('id'))
                .then(() => assert.calledWith(this.underlyingPool.getBrowser, 'id'));
        });
    });

    describe('when there is reuse limit', () => {
        beforeEach(() => {
            this.launchAndFree = (pool, id) => {
                return pool.getBrowser(id)
                    .then((browser) => pool.freeBrowser(browser));
            };
        });

        it('should launch only one session within the reuse limit', () => {
            this.underlyingPool.getBrowser.returns(q(makeStubBrowser('id')));
            const pool = this.poolWithReuseLimits({id: 2});
            return this.launchAndFree(pool, 'id')
                .then(() => pool.getBrowser('id'))
                .then(() => assert.calledOnce(this.underlyingPool.getBrowser));
        });

        it('should launch next session when over reuse limit', () => {
            this.underlyingPool.getBrowser
                .onFirstCall().returns(q(makeStubBrowser('id')))
                .onSecondCall().returns(q(makeStubBrowser('id')));
            const pool = this.poolWithReuseLimits({id: 2});
            return this.launchAndFree(pool, 'id')
                .then(() => this.launchAndFree(pool, 'id'))
                .then(() => pool.getBrowser('id'))
                .then(() => assert.calledTwice(this.underlyingPool.getBrowser));
        });

        it('should get new session for each suite if reuse limit equal 1', () => {
            this.underlyingPool.getBrowser
                .onFirstCall().returns(q(makeStubBrowser('browserId')))
                .onSecondCall().returns(q(makeStubBrowser('browserId')));
            const pool = this.poolWithReuseLimits({browserId: 1});
            return this.launchAndFree(pool, 'browserId')
                .then(() => pool.getBrowser('browserId'))
                .then(() => assert.calledTwice(this.underlyingPool.getBrowser));
        });

        it('should close old session when reached reuse limit', () => {
            const browser = makeStubBrowser('id');
            this.underlyingPool.getBrowser.returns(q(browser));
            const pool = this.poolWithReuseLimits({id: 2});
            return this.launchAndFree(pool, 'id')
                .then(() => this.launchAndFree(pool, 'id'))
                .then(() => assert.calledWith(this.underlyingPool.freeBrowser, browser));
        });

        it('should cache browser with different id even if the first one is over limit', () => {
            this.underlyingPool.getBrowser
                .withArgs('first').returns(q(makeStubBrowser('first')));

            const createSecondBrowser = this.underlyingPool.getBrowser.withArgs('second');
            createSecondBrowser.returns(q(makeStubBrowser('second')));

            const pool = this.poolWithReuseLimits({
                first: 2,
                second: 2
            });
            return this.launchAndFree(pool, 'first')
                .then(() => this.launchAndFree(pool, 'second'))
                .then(() => this.launchAndFree(pool, 'first'))
                .then(() => pool.getBrowser('second'))
                .then(() => assert.calledOnce(createSecondBrowser));
        });
    });
});
