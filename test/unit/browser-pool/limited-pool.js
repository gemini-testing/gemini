'use strict';
const Promise = require('bluebird');
const LimitedPool = require('lib/browser-pool/limited-pool');
const rejectedPromise = require('test/util').rejectedPromise;
const browserWithId = require('test/util').browserWithId;
const CancelledError = require('lib/errors/cancelled-error');

describe('LimitedPool', () => {
    const sandbox = sinon.sandbox.create();
    let underlyingPool;

    const makePool_ = (limit) => new LimitedPool(limit || 1, underlyingPool);
    const makeBrowser_ = () => sandbox.stub(browserWithId('id'));

    beforeEach(() => {
        underlyingPool = {
            getBrowser: sinon.stub(),
            freeBrowser: sinon.stub().returns(Promise.resolve()),
            cancel: sinon.stub()
        };
    });

    afterEach(() => sandbox.restore());

    it('should request browser from underlying pool', () => {
        const browser = makeBrowser_();
        underlyingPool.getBrowser.returns(Promise.resolve(browser));
        const pool = makePool_();

        return assert.eventually.equal(pool.getBrowser('id'), browser);
    });

    describe('should return browser to underlying pool', () => {
        let browser;
        let pool;

        beforeEach(() => {
            browser = makeBrowser_();
            pool = makePool_();
            underlyingPool.getBrowser.returns(Promise.resolve(browser));
        });

        it('when freed', () => {
            return pool.freeBrowser(browser)
                .then(() => assert.calledWith(underlyingPool.freeBrowser, browser));
        });

        it('for release if there are no more requests', () => {
            return pool.getBrowser('first')
                .then(() => pool.freeBrowser(browser))
                .then(() => assert.calledWith(underlyingPool.freeBrowser, browser, {force: true}));
        });

        it('for caching if there is at least one pending request', () => {
            return pool.getBrowser('first')
                .then(() => {
                    pool.getBrowser('second');
                    return pool.freeBrowser(browser);
                })
                .then(() => assert.calledWith(underlyingPool.freeBrowser, browser, {force: false}));
        });

        it('for release if there are pending requests but forced to free', () => {
            return pool.getBrowser('first')
                .then(() => {
                    pool.getBrowser('second');
                    return pool.freeBrowser(browser, {force: true});
                })
                .then(() => assert.calledWith(underlyingPool.freeBrowser, browser, {force: true}));
        });

        it('for caching if there are pending requests', () => {
            return pool.getBrowser('first')
                .then(() => {
                    pool.getBrowser('second');
                    pool.getBrowser('third');
                    return pool.freeBrowser(browser);
                })
                .then(() => assert.calledWith(underlyingPool.freeBrowser, browser, {force: false}));
        });

        it('taking into account number of failed browser requests', () => {
            const browser = makeBrowser_();
            const pool = makePool_(2);

            underlyingPool.getBrowser
                .withArgs('first').returns(Promise.resolve(browser))
                .withArgs('second').returns(rejectedPromise());

            return Promise
                .all([
                    pool.getBrowser('first'),
                    pool.getBrowser('second').reflect()
                ])
                .then(() => pool.freeBrowser(browser))
                .then(() => assert.calledWith(underlyingPool.freeBrowser, browser, {force: true}));
        });
    });

    it('should launch next request from queue on fail to receive browser from underlying pool', () => {
        var browser = makeBrowser_(),
            pool = makePool_();

        underlyingPool.getBrowser.onFirstCall().returns(rejectedPromise());
        underlyingPool.getBrowser.onSecondCall().returns(Promise.resolve(browser));

        pool.getBrowser('id').catch(() => {});

        assert.eventually.equal(pool.getBrowser('id'), browser);
    });

    describe('limit', () => {
        it('should launch all browser in limit', () => {
            underlyingPool.getBrowser
                .withArgs('first').returns(Promise.resolve(makeBrowser_()))
                .withArgs('second').returns(Promise.resolve(makeBrowser_()));
            const pool = makePool_(2);

            return Promise.all([pool.getBrowser('first'), pool.getBrowser('second')])
                .then(() => {
                    assert.calledTwice(underlyingPool.getBrowser);
                    assert.calledWith(underlyingPool.getBrowser, 'first');
                    assert.calledWith(underlyingPool.getBrowser, 'second');
                });
        });

        it('should not launch browsers out of limit', () => {
            underlyingPool.getBrowser.returns(Promise.resolve(makeBrowser_()));
            const pool = makePool_(1);

            const result = pool.getBrowser('first')
                .then(() => pool.getBrowser('second').timeout(100, 'timeout'));

            return assert.isRejected(result, /timeout$/);
        });

        it('should launch next browsers after previous are released', () => {
            const expectedBrowser = makeBrowser_();
            const pool = makePool_(1);

            underlyingPool.getBrowser
                .withArgs('first').returns(Promise.resolve(makeBrowser_()))
                .withArgs('second').returns(Promise.resolve(expectedBrowser));

            const result = pool.getBrowser('first')
                .then((browser) => pool.freeBrowser(browser))
                .then(() => pool.getBrowser('second'));

            return assert.eventually.equal(result, expectedBrowser);
        });

        it('should launch queued browser when previous are released', () => {
            const expectedBrowser = makeBrowser_();
            const pool = makePool_(1);

            underlyingPool.getBrowser
                .withArgs('first').returns(Promise.resolve(makeBrowser_()))
                .withArgs('second').returns(Promise.resolve(expectedBrowser));

            const result = pool.getBrowser('first')
                .then((browser) => {
                    const secondPromise = pool.getBrowser('second');
                    return Promise.delay(100)
                        .then(() => pool.freeBrowser(browser))
                        .then(() => secondPromise);
                });

            return assert.eventually.equal(result, expectedBrowser);
        });

        it('should launch next browsers if free failed', () => {
            var expectedBrowser = makeBrowser_();
            const pool = makePool_(1);

            underlyingPool.getBrowser
                .withArgs('first').returns(Promise.resolve(makeBrowser_()))
                .withArgs('second').returns(Promise.resolve(expectedBrowser));

            underlyingPool.freeBrowser.returns(rejectedPromise());

            var result = pool.getBrowser('first')
                .then((browser) => {
                    var secondPromise = pool.getBrowser('second');
                    return Promise.delay(100)
                        .then(() => pool.freeBrowser(browser))
                        .catch(() => secondPromise);
                });

            return assert.eventually.equal(result, expectedBrowser);
        });

        it('should not wait for queued browser to start after release browser', () => {
            const pool = makePool_(1);
            const afterFree = sinon.spy().named('afterFree');
            const afterSecondGet = sinon.spy().named('afterSecondGet');

            underlyingPool.getBrowser
                .withArgs('first').returns(Promise.resolve(makeBrowser_()))
                .withArgs('second').returns(Promise.resolve());

            return pool.getBrowser('first')
                .then((browser) => {
                    const freeFirstBrowser = Promise.delay(100)
                        .then(() => pool.freeBrowser(browser))
                        .then(afterFree);

                    const getSecondBrowser = pool.getBrowser('second')
                        .then(afterSecondGet);

                    return Promise.all([getSecondBrowser, freeFirstBrowser])
                        .then(() => assert.callOrder(afterFree, afterSecondGet));
                });
        });

        it('should reject the queued call when underlying pool rejects the request', () => {
            const pool = makePool_(1);
            const error = new Error('You shall not pass');
            underlyingPool.getBrowser
                .onFirstCall().returns(Promise.resolve(makeBrowser_()))
                .onSecondCall().returns(rejectedPromise(error));

            return pool.getBrowser('id')
                .then((browser) => {
                    const secondRequest = pool.getBrowser('id');
                    return pool.freeBrowser(browser)
                        .then(() => assert.isRejected(secondRequest, error));
                });
        });
    });

    describe('cancel', () => {
        it('should cancel queued browsers', () => {
            const pool = makePool_(1);
            underlyingPool.getBrowser.returns(Promise.resolve(makeBrowser_()));

            return pool.getBrowser('id')
                .then(() => {
                    var secondRequest = pool.getBrowser('id');

                    pool.cancel();

                    return assert.isRejected(secondRequest, CancelledError);
                });
        });

        it('should cancel an underlying pool', () => {
            const pool = makePool_(1);

            pool.cancel();

            assert.calledOnce(underlyingPool.cancel);
        });

        it('should reset request queue', () => {
            const firstBrowser = makeBrowser_();
            const pool = makePool_(1);

            underlyingPool.getBrowser
                .withArgs('first').returns(Promise.resolve(firstBrowser));

            const result = pool.getBrowser('first')
                .then((browser) => {
                    const secondBrowserPromise = pool.getBrowser('second');

                    pool.cancel();

                    return pool.freeBrowser(browser).thenReturn(secondBrowserPromise);
                });

            return result
                .catch(() => {
                    assert.calledOnce(underlyingPool.getBrowser);
                    assert.neverCalledWith(underlyingPool.getBrowser, 'second');
                });
        });
    });
});
