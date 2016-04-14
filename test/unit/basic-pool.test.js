'use strict';
var q = require('q'),
    Browser = require('../../lib/browser'),
    BasicPool = require('../../lib/browser-pool/basic-pool'),
    signalHandler = require('../../lib/signal-handler'),
    browserWithId = require('../util').browserWithId;

describe('UnlimitedPool', function() {
    beforeEach(function() {
        this.browserConfig = {id: 'id'};
        this.config = {
            forBrowser: sinon.stub().returns(this.browserConfig)
        };
        this.sinon = sinon.sandbox.create();
        this.browser = sinon.stub(browserWithId('id'));
        this.browser.launch.returns(q());
        this.browser.quit.returns(q());
        this.sinon.stub(Browser, 'create').returns(this.browser);
        this.pool = new BasicPool(this.config);

        this.requestBrowser = function() {
            return this.pool.getBrowser('id');
        };
    });

    afterEach(function() {
        this.sinon.restore();
    });

    it('should create new browser when requested', function() {
        var _this = this;
        return this.requestBrowser()
            .then(function() {
                assert.calledWith(Browser.create, _this.browserConfig);
            });
    });

    it('should launch a browser', function() {
        var _this = this;
        return this.requestBrowser()
            .then(function() {
                assert.calledOnce(_this.browser.launch);
            });
    });

    it('should finalize browser if failed to create it', function() {
        var freeBrowser = this.sinon.spy(this.pool, 'freeBrowser'),
            assertCalled = function() {
                assert.called(freeBrowser);
            };

        this.browser.reset.returns(q.reject());

        return this.requestBrowser()
            .then(assertCalled, assertCalled);
    });

    it('should quit a browser when freed', function() {
        var _this = this;
        return this.requestBrowser()
            .then(function(browser) {
                return _this.pool.freeBrowser(browser);
            })
            .then(function() {
                assert.calledOnce(_this.browser.quit);
            });
    });

    it('should quit a browser on exit signal', function() {
        var _this = this;
        return this.requestBrowser()
            .then(function() {
                signalHandler.emit('exit');
            })
            .then(function() {
                assert.calledOnce(_this.browser.quit);
            });
    });
});
