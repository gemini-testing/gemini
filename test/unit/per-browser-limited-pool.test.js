'use strict';
var q = require('q'),
    PerBrowserLimitedPool = require('../../lib/browser-pool/per-browser-limited-pool'),
    browserWithId = require('../util').makeBrowser;

describe('PerBrowserLimitedPool', function() {
    beforeEach(function() {
        this.underlyingPool = {
            getBrowser: sinon.stub(),
            freeBrowser: sinon.stub().returns(q())
        };

        this.poolWithLimits = function(limits) {
            var config = {
                getBrowserIds: sinon.stub().returns(Object.keys(limits)),
                forBrowser: function(id) {
                    return {
                        id: id,
                        sessionsPerBrowser: limits[id],
                        desiredCapabilities: {}
                    };
                }
            };
            return new PerBrowserLimitedPool(config, this.underlyingPool);
        };
    });

    it('should request browser from underlying pool', function() {
        var browser = browserWithId('id');
        this.underlyingPool.getBrowser.returns(q(browser));
        var pool = this.poolWithLimits({id: 1});
        return assert.eventually.equal(pool.getBrowser('id'), browser);
    });

    it('should return browser to underlying pool when freed', function() {
        var _this = this,
            browser = browserWithId('id'),
            pool = this.poolWithLimits({id: 1});
        return pool.freeBrowser(browser).then(function() {
            assert.calledWith(_this.underlyingPool.freeBrowser, browser);
        });
    });

    describe('limit', function() {
        it('should launch all browser in limit', function() {
            var _this = this;
            this.underlyingPool.getBrowser
                .onFirstCall().returns(q(browserWithId('id')))
                .onSecondCall().returns(q(browserWithId('id')));
            var pool = this.poolWithLimits({id: 2});
            return pool.getBrowser('id')
                .then(function() {
                    return pool.getBrowser('id');
                })
                .then(function() {
                    assert.calledTwice(_this.underlyingPool.getBrowser);
                });
        });

        it('should not launch browsers out of limit', function() {
            this.underlyingPool.getBrowser.returns(q(browserWithId('id')));
            var pool = this.poolWithLimits({id: 1}),
                result = pool.getBrowser('id')
                    .then(function() {
                        return pool.getBrowser('id').timeout(100, 'timeout');
                    });
            return assert.isRejected(result, /^timeout$/);
        });

        it('should allow to launch different browser when first is over limit', function() {
            var expectedBrowser = browserWithId('second');
            this.underlyingPool.getBrowser
                .withArgs('first').returns(q(browserWithId('first')))
                .withArgs('second').returns(q(expectedBrowser));

            var pool = this.poolWithLimits({first: 1, second: 1}),
                result = pool.getBrowser('first')
                    .then(function() {
                        return pool.getBrowser('second');
                    });
            return assert.eventually.equal(result, expectedBrowser);
        });

        it('should launch next browsers after previous are released', function() {
            var expectedBrowser = browserWithId('id'),
                pool = this.poolWithLimits({id: 1});

            this.underlyingPool.getBrowser
                .onFirstCall().returns(q(browserWithId('id')))
                .onSecondCall().returns(q(expectedBrowser));

            var result = pool.getBrowser('id')
                .then(function(browser) {
                    return pool.freeBrowser(browser);
                })
                .then(function() {
                    return pool.getBrowser('id');
                });

            return assert.eventually.equal(result, expectedBrowser);
        });

        it('should launch queued browser when previous are released', function() {
            var expectedBrowser = browserWithId('id'),
                pool = this.poolWithLimits({id: 1});

            this.underlyingPool.getBrowser
                .onFirstCall().returns(q(browserWithId('id')))
                .onSecondCall().returns(q(expectedBrowser));

            var result = pool.getBrowser('id')
                .then(function(browser) {
                    var secondPromise = pool.getBrowser('id');
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
    });
});
