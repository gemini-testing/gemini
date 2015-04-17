'use strict';
var sinon = require('sinon'),
    assert = require('chai').assert,
    q = require('q'),
    Browser = require('../lib/browser'),
    Pool = require('../lib/browser-pool/pool');

describe('UnlimitedPool', function() {
    beforeEach(function() {
        this.config = {
            browsers: {
                id: {browserName: 'id'}
            }
        };
        this.sinon = sinon.sandbox.create();
        this.browser = sinon.stub(new Browser(this.config, 'id'));
        this.browser.launch.returns(q());
        this.browser.quit.returns(q());
        this.sinon.stub(Browser.prototype, '__constructor')
            .returns(this.browser);
        this.pool = new Pool(this.config);

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
                assert.calledWith(Browser.prototype.__constructor, _this.config, 'id');
            });
    });

    it('should launch a browser', function() {
        var _this = this;
        return this.requestBrowser()
            .then(function() {
                assert.calledOnce(_this.browser.launch);
            });
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

    // SIGHUP, SIGINT and SIGTERM are handled in the same way
    // so we will test only one of them
    describe('on signal', function() {
        var defer;

        beforeEach(function() {
            defer = q.defer();
            this.sinon.stub(process, 'exit', defer.resolve.bind(defer));
        });

        it('should quit a browser on SIGHUP', function() {
            var _this = this;
            return this.requestBrowser()
                .then(function() {
                    process.emit('SIGHUP');
                })
                .then(function() {
                    assert.calledOnce(_this.browser.quit);
                });
        });

        it('should exit on SIGHUP', function() {
            return this.requestBrowser()
                .then(function() {
                    process.emit('SIGHUP');
                    return assert.becomes(defer.promise, 128 + 1);
                });
        });
    });
});
