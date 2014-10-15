'use strict';
var Browser = require('../lib/browser'),
    q = require('q'),
    wd = require('wd'),
    fs = require('fs'),
    path = require('path'),
    sinon = require('sinon');

describe('browser', function() {
    beforeEach(function() {
        this.sinon = sinon.sandbox.create();
    });

    afterEach(function() {
        this.sinon.restore();
    });

    describe('properties', function() {
        it('should have browserName property', function() {
            var browser = new Browser({}, 'id', {
                browserName: 'name'
            });

            browser.browserName.must.be('name');
        });

        it('should have version propery', function() {
            var browser = new Browser({}, 'id', {
                version: '1.0'
            });

            browser.version.must.be('1.0');
        });
    });

    describe('launch', function() {
        beforeEach(function() {
            this.wd = {
                configureHttp: sinon.stub().returns(q()),
                init: sinon.stub().returns(q({}))
            };

            this.config = {
                capabilities: {},
                http: {
                    timeout: 100,
                    retries: 5,
                    retryDelay: 25
                }
            };
            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);
            this.browser = new Browser(this.config, 'browser', {
                browserName: 'browser',
                version: '1.0'
            });
        });

        it('should init browser with browserName, version and takeScreenshot capabilites', function() {
            var _this = this;
            return this.browser.launch().then(function() {
                sinon.assert.calledWith(_this.wd.init, {
                    browserName: 'browser',
                    version: '1.0',
                    takesScreenshot: true
                });
            });
        });

        it('should set http options for browser instance', function() {
            var _this = this;
            return this.browser.launch().then(function() {
                sinon.assert.calledWith(_this.wd.configureHttp, {
                    timeout: 100,
                    retries: 5,
                    retryDelay: 25
                });
            });
        });

        it('should mix additional capabilites from config', function() {
            var _this = this;
            this.config.capabilities = {
                option1: 'value1',
                option2: 'value2'
            };

            return this.browser.launch().then(function() {
                sinon.assert.calledWith(_this.wd.init, {
                    browserName: 'browser',
                    version: '1.0',
                    takesScreenshot: true,
                    option1: 'value1',
                    option2: 'value2'
                });
            });
        });
    });

    describe('open', function() {
        beforeEach(function() {
            this.wd = {
                execute: sinon.stub().returns(q({})),
                get: sinon.stub().returns(q({})),
                elementByCssSelector: sinon.stub().returns(q()),
                moveTo: sinon.stub().returns(q())
            };

            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = new Browser({}, 'browser', {browserName: 'browser', version: '1.0'});
        });

        it('should open URL', function() {
            var _this = this;
            return this.browser.open('http://www.example.com')
                .then(function() {
                    sinon.assert.calledWith(_this.wd.get, 'http://www.example.com');
                });
        });

        it('should execute client script');

        it('should reset mouse position', function() {
            var _this = this,
                elem = {};
            this.wd.elementByCssSelector.returns(q(elem));
            return this.browser.open('http://www.example.com')
                .then(function() {
                    sinon.assert.calledWith(_this.wd.moveTo, elem, 0, 0);
                });
        });
    });

    describe('prepareScreenshot', function() {
        beforeEach(function() {
            this.wd = {
                eval: sinon.stub().returns(q({}))
            };
            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = new Browser({}, 'browser', {browserName: 'browser', version: '1.0'});
        });

        it('should execute client side method', function() {
            var _this = this;
            return this.browser.prepareScreenshot(['.selector1', '.selector2'], {}).then(function() {
                /*jshint evil:true*/
                sinon.assert.calledWith(
                    _this.wd.eval,
                    '__gemini.prepareScreenshot([".selector1",".selector2"], {})');
            });
        });

        it('should reject promise if client-side method returned error', function(done) {
            /*jshint evil:true*/
            this.wd.eval.returns(q({
                error: 'err',
                message: 'message'
            }));

            return this.browser.prepareScreenshot(['.selector']).fail(function(e) {
                e.message.must.be('message');
                done();
            });
        });
    });

    describe('captureFullscreenImage', function() {
        it('should call to the driver', function() {
            var img = path.join(__dirname, 'functional', 'data', 'image', 'image1.png'),
                imgData = fs.readFileSync(img),
                stubWd = {
                    takeScreenshot: sinon.stub().returns(q(imgData))
                };

            this.sinon.stub(wd, 'promiseRemote').returns(stubWd);
            var browser = new Browser({}, 'browser', {browserName: 'browser', version: '1.0'});
            return browser.captureFullscreenImage().then(function() {
                sinon.assert.called(stubWd.takeScreenshot);
            });
        });
    });
});
