'use strict';
var sinon = require('sinon'),
    assert = require('chai').assert,
    q = require('q'),
    Pool = require('../lib/browser-pool/caching-pool'),
    browserWithId = require('./util').browserWithId;

describe('CachingPool', function() {
    function makeStubBrowser(id) {
        var browser = sinon.stub(browserWithId(id));
        browser.launch.returns(q());
        browser.reset.returns(q());
        return browser;
    }

    beforeEach(function() {
        this.underlyingPool = {
            getBrowser: sinon.stub(),
            freeBrowser: sinon.stub().returns(q()),
            finalizeBrowsers: sinon.stub().returns(q())
        };

        this.poolWithReuseLimits = function(limits) {
            var config = {
                getBrowserIds: sinon.stub().returns(Object.keys(limits)),
                forBrowser: function(id) {
                    return {
                        id: id,
                        suitesPerSession: limits[id],
                        desiredCapabilities: {}
                    };
                }
            };
            return new Pool(config, this.underlyingPool);
        };

        this.makePool = function() {
            return this.poolWithReuseLimits({id: Infinity});
        };

        this.sinon = sinon.sandbox.create();
    });

    afterEach(function() {
        this.sinon.restore();
    });

    it('should create new browser when requested first time', function() {
        this.underlyingPool.getBrowser.returns(q(makeStubBrowser('id')));
        var _this = this,
            pool = this.makePool();
        return pool.getBrowser('id')
            .then(function() {
                assert.calledWith(_this.underlyingPool.getBrowser, 'id');
            });
    });

    it('should return same browser as returned by underlying pool', function() {
        var browser = makeStubBrowser('id');
        this.underlyingPool.getBrowser.returns(q(browser));
        var pool = this.makePool();
        return assert.eventually.equal(pool.getBrowser('id'), browser);
    });

    it('should not reset the new browser', function() {
        var browser = makeStubBrowser('id');
        this.underlyingPool.getBrowser.returns(q(browser));
        return this.makePool().getBrowser('id')
            .then(function() {
                assert.notCalled(browser.reset);
            });
    });

    it('should create and launch new browser if there is free browser with different id', function() {
        var _this = this;

        this.underlyingPool.getBrowser
            .withArgs('first').returns(q(makeStubBrowser('first')))
            .withArgs('second').returns(q(makeStubBrowser('second')));
        var pool = this.poolWithReuseLimits({
            first: 1,
            second: 1
        });
        return pool.getBrowser('first')
            .then(function(browser) {
                return pool.freeBrowser(browser);
            })
            .then(function() {
                return pool.getBrowser('second');
            })
            .then(function() {
                assert.calledWith(_this.underlyingPool.getBrowser, 'second');
            });
    });

    it('should not quit browser when freed', function() {
        this.underlyingPool.getBrowser.returns(q(makeStubBrowser('id')));
        var _this = this,
            pool = this.makePool();
        return pool.getBrowser('id')
            .then(function(browser) {
                return pool.freeBrowser(browser);
            })
            .then(function() {
                assert.notCalled(_this.underlyingPool.freeBrowser);
            });
    });

    describe('when there is free browser with same id', function() {
        beforeEach(function() {
            this.browser = makeStubBrowser('id');
            this.pool = this.makePool();
            return this.pool.freeBrowser(this.browser);
        });

        it('should not create second instance', function() {
            var _this = this;
            return this.pool.getBrowser('id')
                .then(function() {
                    assert.notCalled(_this.underlyingPool.getBrowser);
                });
        });

        it('should reset the browser', function() {
            var _this = this;
            return this.pool.getBrowser('id')
                .then(function() {
                    assert.calledOnce(_this.browser.reset);
                });
        });

        it('should free cached instance when browser finished', function() {
            var _this = this;
            return this.pool.finalizeBrowsers('id')
                .then(function() {
                    assert.calledWith(_this.underlyingPool.freeBrowser);
                });
        });

        it('should call finalize on underlying pool when browser finished', function() {
            var _this = this;
            return this.pool.finalizeBrowsers('id')
                .then(function() {
                    assert.calledWith(_this.underlyingPool.finalizeBrowsers);
                });
        });
    });

    describe('when there are multiple browsers with same id', function() {
        beforeEach(function() {
            this.firstBrowser = makeStubBrowser('id');
            this.secondBrowser = makeStubBrowser('id');
            this.pool = this.makePool();
            return q.all([
                this.pool.freeBrowser(this.firstBrowser),
                this.pool.freeBrowser(this.secondBrowser)
            ]);
        });

        it('should return last browser in cache on first getBrowser', function() {
            return assert.becomes(this.pool.getBrowser('id'), this.secondBrowser);
        });

        it('should return first browser on second getBrowser', function() {
            var _this = this;
            return this.pool.getBrowser('id')
                .then(function() {
                    return assert.becomes(_this.pool.getBrowser('id'), _this.firstBrowser);
                });
        });

        it('should launch new session when there are no free browsers left', function() {
            var _this = this;
            return this.pool.getBrowser('id')
                .then(function() {
                    return _this.pool.getBrowser('id');
                })
                .then(function() {
                    return _this.pool.getBrowser('id');
                })
                .then(function() {
                    assert.calledWith(_this.underlyingPool.getBrowser, 'id');
                });
        });
    });

    describe('when there is reuse limit', function() {
        beforeEach(function() {
            this.launchAndFree = function(pool, id) {
                return pool.getBrowser(id)
                    .then(function(browser) {
                        return pool.freeBrowser(browser);
                    });
            };
        });

        it('should launch only one session within the reuse limit', function() {
            this.underlyingPool.getBrowser.returns(q(makeStubBrowser('id')));
            var _this = this,
                pool = this.poolWithReuseLimits({
                    id: 2
                });
            return this.launchAndFree(pool, 'id')
                .then(function(browser) {
                    return pool.getBrowser('id');
                })
                .then(function() {
                    assert.calledOnce(_this.underlyingPool.getBrowser);
                });
        });

        it('should launch next session when over reuse limit', function() {
            this.underlyingPool.getBrowser
                .onFirstCall().returns(q(makeStubBrowser('id')))
                .onSecondCall().returns(q(makeStubBrowser('id')));
            var _this = this,
                pool = this.poolWithReuseLimits({
                    id: 2
                });
            return this.launchAndFree(pool, 'id')
                .then(function(browser) {
                    return _this.launchAndFree(pool, 'id');
                })
                .then(function() {
                    return pool.getBrowser('id');
                })
                .then(function() {
                    assert.calledTwice(_this.underlyingPool.getBrowser);
                });
        });

        it('should close old session when reached reuse limit', function() {
            var browser = makeStubBrowser('id');
            this.underlyingPool.getBrowser.returns(q(browser));
            var _this = this,
                pool = this.poolWithReuseLimits({
                    id: 2
                });
            return this.launchAndFree(pool, 'id')
                .then(function() {
                    return _this.launchAndFree(pool, 'id');
                })
                .then(function() {
                    assert.calledWith(_this.underlyingPool.freeBrowser, browser);
                });
        });

        it('should cache browser with different id even if the first one is over limit', function() {
            this.underlyingPool.getBrowser
                .withArgs('first').returns(q(makeStubBrowser('first')));

            var createSecondBrowser = this.underlyingPool.getBrowser.withArgs('second');
            createSecondBrowser.returns(q(makeStubBrowser('second')));

            var _this = this,
                pool = this.poolWithReuseLimits({
                    first: 2,
                    second: 2
                });
            return this.launchAndFree(pool, 'first')
                .then(function() {
                    return _this.launchAndFree(pool, 'second');
                })
                .then(function() {
                    return _this.launchAndFree(pool, 'first');
                })
                .then(function() {
                    return pool.getBrowser('second');
                })
                .then(function() {
                    assert.calledOnce(createSecondBrowser);
                });
        });
    });
});
