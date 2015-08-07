'use strict';
var sinon = require('sinon'),
    assert = require('chai').assert,
    Browser = require('../lib/browser'),
    q = require('q'),
    LimitedPool = require('../lib/browser-pool/limited-pool');

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

            return this.sinon.stub(new Browser(config, 'id'));
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

    it('should return browser to underlying pool when freed', function() {
        var _this = this,
            browser = this.makeBrowser(),
            pool = this.makePool();
        return pool.freeBrowser(browser).then(function() {
            assert.calledWith(_this.underlyingPool.freeBrowser, browser);
        });
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
            return assert.isRejected(result, /^timeout$/);
        });

        it('should launch next browsers after previous are released', function() {
            var expectedBrowser = this.makeBrowser(),
                pool = this.makePool(1);

            this.underlyingPool.getBrowser
                .withArgs('first').returns(q(this.makeBrowser()))
                .withArgs('second').returns(expectedBrowser);

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

        it('should cancel queued browsers when cancel is called', function() {
            var pool = this.makePool(1);
            this.underlyingPool.getBrowser.returns(q(this.makeBrowser()));
            return pool.getBrowser('id')
                .then(function() {
                    var secondRequest = pool.getBrowser('id');
                    pool.cancel();
                    return assert.isRejected(secondRequest, LimitedPool.CancelledError);
                });
        });

        it('should reject the queued call when underlying pool rejects the reuqest', function() {
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
