'use strict';
var Browser = require('../lib/browser'),
    GeminiError = require('../lib/errors/gemini-error'),
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
                init: sinon.stub().returns(q({})),
                get: sinon.stub().returns(q({})),
                eval: sinon.stub().returns(q(''))
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
                version: '1.0',
                // disable calibration for tests to avoid a lot of mocking
                '--noCalibrate': true
            });
        });

        it('should init browser with browserName, version and takeScreenshot capabilites', function() {
            var _this = this;
            return this.browser.launch().then(function() {
                sinon.assert.calledWith(_this.wd.init, {
                    browserName: 'browser',
                    version: '1.0',
                    takesScreenshot: true,
                    '--noCalibrate': true
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
                    '--noCalibrate': true,
                    option1: 'value1',
                    option2: 'value2'
                });
            });
        });

        it('should call calibrate() by default', function() {
            var _this = this;
            this.browser = new Browser(this.config, 'browser', {
                browserName: 'browser',
                version: '1.0'
            });

            this.sinon.stub(this.browser, 'calibrate').returns(q({}));

            return this.browser.launch().then(function() {
                sinon.assert.calledWith(_this.browser.calibrate);
            });
        });

        it('should not call calibrate() when --noCalibrate is true', function() {
            var _this = this;
            this.sinon.stub(this.browser, 'calibrate').returns(q({}));
            return this.browser.launch().then(function() {
                sinon.assert.notCalled(_this.browser.calibrate);
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
                sinon.assert.called(_this.wd.eval);
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

    describe('calibrate', function() {
        var img = path.join(__dirname, 'functional', 'data', 'image', 'calibrate.png'),
            imgData = fs.readFileSync(img);

        beforeEach(function() {
            this.wd = {
                execute: sinon.stub().returns(q({})),
                get: sinon.stub().returns(q({})),
                elementByCssSelector: sinon.stub().returns(q()),
                moveTo: sinon.stub().returns(q()),
                takeScreenshot: sinon.stub().returns(q(imgData))
            };

            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = new Browser({}, 'browser', {browserName: 'browser', version: '1.0'});
        });

        it('should calculate correct crop area', function() {
            return this.browser.calibrate()
                .then(function(rs) {
                    rs.must.eql({top: 24, left: 6, right: 2, bottom: 0});
                });
        });

        it('should fail on broken calibration page', function(done) {
            this.wd.takeScreenshot = sinon.stub().returns(q(
                fs.readFileSync(path.join(__dirname, 'functional', 'data', 'image', 'calibrate-broken.png'))
            ));

            this.browser.calibrate()
                .then(function(rs) {
                    done(new Error('Promise must be rejected'));
                })
                .fail(function(err) {
                    if (err instanceof GeminiError) {
                        return done();
                    }
                    done(new Error('Promise must be rejected with GeminiError'));
                });
        });

        it('captureFullscreenImage() should crop according to calibration result', function() {
            var _this = this;
            return this.browser.calibrate()
                .then(function() {
                    return _this.browser.captureFullscreenImage().then(function(img) {
                        img.getSize().must.eql({width: 572, height: 311});
                    });
                });
        });
    });
});
