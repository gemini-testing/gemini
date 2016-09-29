'use strict';
var Browser = require('lib/browser'),
    q = require('bluebird-q'),
    LimitedPool = require('lib/browser-pool/limited-pool'),
    CancelledError = require('lib/errors/cancelled-error');

describe('LimitedPool', function() {
    beforeEach(function() {
        this.underlyingPool = {
            getBrowser: sinon.stub(),
            freeBrowser: sinon.stub().returns(q()),
            cancel: sinon.stub()
        };

        this.sinon = sinon.sandbox.create();

        this.makePool = function(limit) {
            return new LimitedPool(limit || 1, this.underlyingPool);
        };

        this.makeBrowser = function() {
            var config = {
                id: 'id',
                desiredCapabilities: {browserName: 'id'}
            };

            return this.sinon.stub(Browser.create(config, 'id'));
        };
    });

    afterEach(function() {
        this.sinon.restore();
    });

    it('should request browser from underlying pool', function() {
        var browser = this.makeBrowser();
        this.underlyingPool.getBrowser.returns(q(browser));
        var pool = this.makePool();
        return assert.eventually.equal(pool.getBrowser('id'), browser);
    });

    describe('should return browser to underlying pool', function() {
        let browser;
        let pool;

        beforeEach(function() {
            browser = this.makeBrowser();
            pool = this.makePool();
            this.underlyingPool.getBrowser.returns(q(browser));
        });

        it('when freed', function() {
            return pool.freeBrowser(browser)
                .then(() => assert.calledWith(this.underlyingPool.freeBrowser, browser));
        });

        it('for release if there are no more requests', function() {
            return pool.getBrowser('first')
                .then(() => pool.freeBrowser(browser))
                .then(() => assert.calledWith(this.underlyingPool.freeBrowser, browser, {force: true}));
        });

        it('for caching if there is at least one pending request', function() {
            return pool.getBrowser('first')
                .then(() => {
                    pool.getBrowser('second');
                    return pool.freeBrowser(browser);
                })
                .then(() => assert.calledWith(this.underlyingPool.freeBrowser, browser, {force: false}));
        });

        it('for release if there are pending requests but forced to free', function() {
            return pool.getBrowser('first')
                .then(() => {
                    pool.getBrowser('second');
                    return pool.freeBrowser(browser, {force: true});
                })
                .then(() => assert.calledWith(this.underlyingPool.freeBrowser, browser, {force: true}));
        });

        it('for caching if there are pending requests', function() {
            return pool.getBrowser('first')
                .then(() => {
                    pool.getBrowser('second');
                    pool.getBrowser('third');
                    return pool.freeBrowser(browser);
                })
                .then(() => assert.calledWith(this.underlyingPool.freeBrowser, browser, {force: false}));
        });

        it('taking into account number of failed browser requests', function() {
            const browser = this.makeBrowser();
            const pool = this.makePool(2);

            this.underlyingPool.getBrowser
                .withArgs('first').returns(q(browser))
                .withArgs('second').returns(q.reject());

            return q.allSettled([
                pool.getBrowser('first'),
                pool.getBrowser('second')
            ])
                .then(() => pool.freeBrowser(browser))
                .then(() => assert.calledWith(this.underlyingPool.freeBrowser, browser, {force: true}));
        });
    });

    it('should launch next request from queue on fail to receive browser from underlying pool', function() {
        var browser = this.makeBrowser(),
            pool = this.makePool();

        this.underlyingPool.getBrowser.onFirstCall().returns(q.reject());
        this.underlyingPool.getBrowser.onSecondCall().returns(browser);

        pool.getBrowser('id');

        assert.eventually.equal(pool.getBrowser('id'), browser);
    });

    describe('limit', function() {
        it('should launch all browser in limit', function() {
            var _this = this;
            this.underlyingPool.getBrowser
                .withArgs('first').returns(q(this.makeBrowser()))
                .withArgs('second').returns(q(this.makeBrowser()));
            var pool = this.makePool(2);
            return q.all([pool.getBrowser('first'), pool.getBrowser('second')])
                .then(function() {
                    assert.calledTwice(_this.underlyingPool.getBrowser);
                    assert.calledWith(_this.underlyingPool.getBrowser, 'first');
                    assert.calledWith(_this.underlyingPool.getBrowser, 'second');
                });
        });

        it('should not launch browsers out of limit', function() {
            this.underlyingPool.getBrowser.returns(q(this.makeBrowser()));
            var pool = this.makePool(1);
            var result = pool.getBrowser('first')
                .then(function() {
                    return pool.getBrowser('second').timeout(100, 'timeout');
                });
            return assert.isRejected(result, /timeout$/);
        });

        it('should launch next browsers after previous are released', function() {
            var expectedBrowser = this.makeBrowser(),
                pool = this.makePool(1);

            this.underlyingPool.getBrowser
                .withArgs('first').returns(q(this.makeBrowser()))
                .withArgs('second').returns(q(expectedBrowser));

            var result = pool.getBrowser('first')
                .then(function(browser) {
                    return pool.freeBrowser(browser);
                })
                .then(function() {
                    return pool.getBrowser('second');
                });

            return assert.eventually.equal(result, expectedBrowser);
        });

        it('should launch queued browser when previous are released', function() {
            var expectedBrowser = this.makeBrowser(),
                pool = this.makePool(1);

            this.underlyingPool.getBrowser
                .withArgs('first').returns(q(this.makeBrowser()))
                .withArgs('second').returns(q(expectedBrowser));

            var result = pool.getBrowser('first')
                .then(function(browser) {
                    var secondPromise = pool.getBrowser('second');
                    return q.delay(100)
                        .then(function() {
                            return pool.freeBrowser(browser);
                        })
                        .then(function() {
                            return secondPromise;
                        });
                });
            return assert.eventually.equal(result, expectedBrowser);
        });

        it('should launch next browsers if free failed', function() {
            var expectedBrowser = this.makeBrowser(),
                pool = this.makePool(1);

            this.underlyingPool.getBrowser
                .withArgs('first').returns(q(this.makeBrowser()))
                .withArgs('second').returns(q(expectedBrowser));

            this.underlyingPool.freeBrowser.returns(q.reject('error'));

            var result = pool.getBrowser('first')
                .then(function(browser) {
                    var secondPromise = pool.getBrowser('second');
                    return q.delay(100)
                        .then(function() {
                            return pool.freeBrowser(browser);
                        })
                        .fail(function() {
                            return secondPromise;
                        });
                });

            return assert.eventually.equal(result, expectedBrowser);
        });

        it('should not wait for queued browser to start after release browser', function() {
            const pool = this.makePool(1);
            const afterFree = sinon.spy().named('afterFree');
            const afterSecondGet = sinon.spy().named('afterSecondGet');

            this.underlyingPool.getBrowser
                .withArgs('first').returns(q(this.makeBrowser()))
                .withArgs('second').returns(q.resolve());

            return pool.getBrowser('first')
                .then((browser) => {
                    const freeFirstBrowser = q.delay(100)
                        .then(() => pool.freeBrowser(browser))
                        .then(afterFree);

                    const getSecondBrowser = pool.getBrowser('second')
                        .then(afterSecondGet);

                    return q.all([getSecondBrowser, freeFirstBrowser])
                        .then(() => assert.callOrder(afterFree, afterSecondGet));
                });
        });

        it('should cancel queued browsers when cancel is called', function() {
            var pool = this.makePool(1);
            this.underlyingPool.getBrowser.returns(q(this.makeBrowser()));
            return pool.getBrowser('id')
                .then(function() {
                    var secondRequest = pool.getBrowser('id');
                    pool.cancel();
                    return assert.isRejected(secondRequest, CancelledError);
                });
        });

        it('should reject the queued call when underlying pool rejects the request', function() {
            var pool = this.makePool(1),
                error = new Error('You shall not pass');
            this.underlyingPool.getBrowser
                .onFirstCall().returns(q(this.makeBrowser()))
                .onSecondCall().returns(q.reject(error));

            return pool.getBrowser('id')
                .then(function(browser) {
                    var secondRequest = pool.getBrowser('id');
                    return pool.freeBrowser(browser)
                        .then(function() {
                            return assert.isRejected(secondRequest, error);
                        });
                });
        });
    });
});
