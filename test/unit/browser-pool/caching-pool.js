'use strict';
const Promise = require('bluebird');
const Pool = require('lib/browser-pool/caching-pool');
const browserWithId = require('../../util').browserWithId;

describe('CachingPool', () => {
    const makeStubBrowser = (id) => {
        const browser = sinon.stub(browserWithId(id));
        browser.launch.returns(Promise.resolve());
        browser.reset.returns(Promise.resolve());
        return browser;
    };

    beforeEach(() => {
        this.underlyingPool = {
            getBrowser: sinon.stub(),
            freeBrowser: sinon.stub().returns(Promise.resolve()),
            finalizeBrowsers: sinon.stub().returns(Promise.resolve()),
            cancel: sinon.stub()
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
        this.underlyingPool.getBrowser.returns(Promise.resolve(makeStubBrowser('id')));
        const pool = this.makePool();
        return pool.getBrowser('id')
            .then(() => assert.calledWith(this.underlyingPool.getBrowser, 'id'));
    });

    it('should return same browser as returned by underlying pool', () => {
        const browser = makeStubBrowser('id');
        this.underlyingPool.getBrowser.returns(Promise.resolve(browser));
        const pool = this.makePool();
        return assert.eventually.equal(pool.getBrowser('id'), browser);
    });

    it('should not reset the new browser', () => {
        const browser = makeStubBrowser('id');
        this.underlyingPool.getBrowser.returns(Promise.resolve(browser));
        return this.makePool().getBrowser('id')
            .then(() => assert.notCalled(browser.reset));
    });

    it('should create and launch new browser if there is free browser with different id', () => {
        this.underlyingPool.getBrowser
            .withArgs('first').returns(Promise.resolve(makeStubBrowser('first')))
            .withArgs('second').returns(Promise.resolve(makeStubBrowser('second')));
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
        this.underlyingPool.getBrowser.returns(Promise.resolve(makeStubBrowser('id')));

        return pool.getBrowser('id')
            .then((browser) => pool.freeBrowser(browser, {force: false}))
            .then(() => assert.notCalled(this.underlyingPool.freeBrowser));
    });

    it('should quit browser when there are no more requests', () => {
        const pool = this.makePool();
        this.underlyingPool.getBrowser.returns(Promise.resolve(makeStubBrowser('id')));

        return pool.getBrowser('id')
            .then((browser) => pool.freeBrowser(browser, {force: true}))
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
                this.browser.reset.returns(Promise.reject('some-error'));
                return assert.isRejected(this.pool.getBrowser('id'), /some-error/);
            });

            it('should put browser back', () => {
                this.browser.reset.returns(Promise.reject());

                return this.pool.getBrowser('id')
                    .catch(() => {
                        assert.calledOnce(this.underlyingPool.freeBrowser);
                        assert.calledWith(this.underlyingPool.freeBrowser, this.browser);
                    });
            });

            it('should keep original error if failed to put browser back', () => {
                this.browser.reset.returns(Promise.reject('reset-error'));
                this.underlyingPool.freeBrowser.returns(Promise.reject('free-error'));

                return assert.isRejected(this.pool.getBrowser('id'), /reset-error/);
            });
        });
    });

    describe('when there are multiple browsers with same id', () => {
        beforeEach(() => {
            this.firstBrowser = makeStubBrowser('id');
            this.secondBrowser = makeStubBrowser('id');
            this.pool = this.makePool();
            return Promise.all([
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
            this.underlyingPool.getBrowser.returns(Promise.resolve(makeStubBrowser('id')));
            const pool = this.poolWithReuseLimits({id: 2});
            return this.launchAndFree(pool, 'id')
                .then(() => pool.getBrowser('id'))
                .then(() => assert.calledOnce(this.underlyingPool.getBrowser));
        });

        it('should launch next session when over reuse limit', () => {
            this.underlyingPool.getBrowser
                .onFirstCall().returns(Promise.resolve(makeStubBrowser('id')))
                .onSecondCall().returns(Promise.resolve(makeStubBrowser('id')));
            const pool = this.poolWithReuseLimits({id: 2});
            return this.launchAndFree(pool, 'id')
                .then(() => this.launchAndFree(pool, 'id'))
                .then(() => pool.getBrowser('id'))
                .then(() => assert.calledTwice(this.underlyingPool.getBrowser));
        });

        it('should get new session for each suite if reuse limit equal 1', () => {
            this.underlyingPool.getBrowser
                .onFirstCall().returns(Promise.resolve(makeStubBrowser('browserId')))
                .onSecondCall().returns(Promise.resolve(makeStubBrowser('browserId')));
            const pool = this.poolWithReuseLimits({browserId: 1});
            return this.launchAndFree(pool, 'browserId')
                .then(() => pool.getBrowser('browserId'))
                .then(() => assert.calledTwice(this.underlyingPool.getBrowser));
        });

        it('should close old session when reached reuse limit', () => {
            const browser = makeStubBrowser('id');
            this.underlyingPool.getBrowser.returns(Promise.resolve(browser));
            const pool = this.poolWithReuseLimits({id: 2});
            return this.launchAndFree(pool, 'id')
                .then(() => this.launchAndFree(pool, 'id'))
                .then(() => assert.calledWith(this.underlyingPool.freeBrowser, browser));
        });

        it('should cache browser with different id even if the first one is over limit', () => {
            this.underlyingPool.getBrowser
                .withArgs('first').returns(Promise.resolve(makeStubBrowser('first')));

            const createSecondBrowser = this.underlyingPool.getBrowser.withArgs('second');
            createSecondBrowser.returns(Promise.resolve(makeStubBrowser('second')));

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

    describe('cancel', () => {
        it('should cancel an underlying pool', () => {
            const pool = this.makePool();

            pool.cancel();

            assert.calledOnce(this.underlyingPool.cancel);
        });
    });
});
