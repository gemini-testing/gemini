'use strict';
var sinon = require('sinon'),
    assert = require('chai').assert,
    q = require('q'),
    Browser = require('../lib/browser'),
    Pool = require('../lib/browser-pool/caching-pool');

describe('CachingPool', function() {
    beforeEach(function() {
        this.underlyingPool = {
            getBrowser: sinon.stub(),
            freeBrowser: sinon.stub().returns(q())
        };
        var config = {
            browsers: {
                first: {browserName: 'first'},
                second: {browserName: 'second'}
            }
        };

        function makeStubBrowser(id) {
            // Constructor needs to be called even for stub instance,
            // because there is no way to stub readonly property
            var browser = sinon.stub(new Browser(config, id));
            browser.launch.returns(q());
            browser.reset.returns(q());
            return browser;
        }

        this.sinon = sinon.sandbox.create();
        this.firstBrowser = makeStubBrowser('first');
        this.secondBrowser = makeStubBrowser('second');
        this.underlyingPool.getBrowser
            .withArgs('first').returns(q(this.firstBrowser))
            .withArgs('second').returns(q(this.secondBrowser));

        this.pool = new Pool(this.underlyingPool);
    });

    afterEach(function() {
        this.sinon.restore();
    });

    it('should create new browser when requested first time', function() {
        var _this = this;
        return this.pool.getBrowser('first')
            .then(function() {
                assert.calledWith(_this.underlyingPool.getBrowser, 'first');
            });
    });

    it('should return same browser as returned by underlying pool', function() {
        return assert.eventually.equal(this.pool.getBrowser('first'), this.firstBrowser);
    });

    it('should not reset the new browser', function() {
        var _this = this;
        return this.pool.getBrowser('first')
            .then(function() {
                assert.notCalled(_this.firstBrowser.reset);
            });
    });

    it('should create and launch new browser if there is free browser with different id', function() {
        var _this = this;
        return this.pool.getBrowser('first')
            .then(function(browser) {
                return _this.pool.freeBrowser(browser);
            })
            .then(function() {
                return _this.pool.getBrowser('second');
            })
            .then(function() {
                assert.calledWith(_this.underlyingPool.getBrowser, 'second');
            });
    });

    it('should not quit browser when freed', function() {
        var _this = this;
        return this.pool.getBrowser('first')
            .then(function(browser) {
                return _this.pool.freeBrowser(browser);
            })
            .then(function() {
                assert.notCalled(_this.underlyingPool.freeBrowser);
            });
    });

    describe('when there is free browser with same id', function() {
        beforeEach(function() {
            var _this = this;
            return this.pool.getBrowser('first')
                .then(function(browser) {
                    return _this.pool.freeBrowser(browser);
                });
        });

        it('should not create second instance', function() {
            var _this = this;
            return this.pool.getBrowser('first')
                .then(function() {
                    assert.calledOnce(_this.underlyingPool.getBrowser);
                });
        });

        it('should reset the browser', function() {
            var _this = this;
            return this.pool.getBrowser('first')
                .then(function() {
                    assert.calledOnce(_this.firstBrowser.reset);
                });
        });

        it('should free cached instance when browser finished', function() {
            var _this = this;
            return this.pool.finalizeBrowsers('first')
                .then(function() {
                    assert.calledWith(_this.underlyingPool.freeBrowser);
                });
        });
    });
});
