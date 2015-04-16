'use strict';
var Browser = require('../lib/browser'),
    Calibrator = require('../lib/calibrator'),
    assert = require('chai').assert,
    q = require('q'),
    wd = require('wd'),
    fs = require('fs'),
    path = require('path'),
    sinon = require('sinon');

function makeBrowser(capabilities, config) {
    config = config || {};
    config.browsers = {id: capabilities};
    return new Browser(config, 'id');
}

describe('browser', function() {
    beforeEach(function() {
        this.sinon = sinon.sandbox.create();
    });

    afterEach(function() {
        this.sinon.restore();
    });

    describe('properties', function() {
        it('should have browserName property', function() {
            var browser = makeBrowser({
                browserName: 'name'
            });

            assert.equal(browser.browserName, 'name');
        });

        it('should have version propery', function() {
            var browser = makeBrowser({
                version: '1.0'
            });

            assert.equal(browser.version, '1.0');
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
            this.calibrator = sinon.createStubInstance(Calibrator);
            this.browser = makeBrowser({
                browserName: 'browser',
                version: '1.0',
                // disable calibration for tests to avoid a lot of mocking
                '--noCalibrate': true
            }, this.config);
        });

        it('should init browser with browserName, version and takeScreenshot capabilites', function() {
            var _this = this;
            return this.browser.launch(this.calibrator).then(function() {
                assert.calledWith(_this.wd.init, {
                    browserName: 'browser',
                    version: '1.0',
                    takesScreenshot: true,
                    '--noCalibrate': true
                });
            });
        });

        it('should set http options for browser instance', function() {
            var _this = this;
            return this.browser.launch(this.calibrator).then(function() {
                assert.calledWith(_this.wd.configureHttp, {
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

            return this.browser.launch(this.calibrator).then(function() {
                assert.calledWith(_this.wd.init, {
                    browserName: 'browser',
                    version: '1.0',
                    takesScreenshot: true,
                    '--noCalibrate': true,
                    option1: 'value1',
                    option2: 'value2'
                });
            });
        });

        it('should calibrate by default', function() {
            var _this = this;
            this.browser = makeBrowser({
                browserName: 'browser',
                version: '1.0'
            }, this.config);

            this.calibrator.calibrate.returns(q());
            return this.browser.launch(this.calibrator).then(function() {
                assert.calledWith(_this.calibrator.calibrate);
            });
        });

        it('should not call calibrate() when --noCalibrate is true', function() {
            var _this = this;
            return this.browser.launch(this.calibrator).then(function() {
                assert.notCalled(_this.calibrator.calibrate);
            });
        });
    });

    describe('open', function() {
        beforeEach(function() {
            this.wd = {
                get: sinon.stub().returns(q({}))
            };

            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = makeBrowser({browserName: 'browser', version: '1.0'});
        });

        it('should open URL', function() {
            var _this = this;
            return this.browser.open('http://www.example.com')
                .then(function() {
                    assert.calledWith(_this.wd.get, 'http://www.example.com');
                });
        });

        it('should execute client script');
    });

    describe('reset', function() {
        beforeEach(function() {
            this.wd = {
                elementByCssSelector: sinon.stub().returns(q()),
                moveTo: sinon.stub().returns(q())
            };

            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = makeBrowser({browserName: 'browser', version: '1.0'});
        });

        it('should reset mouse position', function() {
            var _this = this,
                elem = {};
            this.wd.elementByCssSelector.returns(q(elem));
            return this.browser.reset()
                .then(function() {
                    assert.calledWith(_this.wd.moveTo, elem, 0, 0);
                });
        });
    });

    describe('prepareScreenshot', function() {
        beforeEach(function() {
            this.wd = {
                eval: sinon.stub().returns(q({}))
            };
            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = makeBrowser({browserName: 'browser', version: '1.0'});
        });

        it('should execute client side method', function() {
            var _this = this;
            return this.browser.prepareScreenshot(['.selector1', '.selector2'], {}).then(function() {
                /*jshint evil:true*/
                assert.called(_this.wd.eval);
            });
        });

        it('should reject promise if client-side method returned error', function() {
            /*jshint evil:true*/
            this.wd.eval.returns(q({
                error: 'err',
                message: 'message'
            }));

            var result = this.browser.prepareScreenshot(['.selector']);
            return assert.isRejected(result, /^message$/);
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
            var browser = makeBrowser({browserName: 'browser', version: '1.0'});
            return browser.captureFullscreenImage().then(function() {
                assert.called(stubWd.takeScreenshot);
            });
        });
    });

    describe('calibration', function() {
        beforeEach(function() {
            var img = path.join(__dirname, 'functional', 'data', 'image', 'calibrate.png'),
                imgData = fs.readFileSync(img);
            this.wd = {
                init: sinon.stub().returns(q(imgData)),
                configureHttp: sinon.stub().returns(q()),
                eval: sinon.stub().returns(q('')),
                takeScreenshot: sinon.stub().returns(q(imgData))
            };

            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = makeBrowser({browserName: 'browser', version: '1.0'});
        });

        it('captureFullscreenImage() should crop according to calibration result', function() {
            var _this = this,
                calibrator = {
                    calibrate: sinon.stub().returns(q({top: 24, left: 6, right: 2, bottom: 0}))
                };

            var size = this.browser.launch(calibrator)
                .then(function() {
                    return _this.browser.captureFullscreenImage();
                })
                .then(function(image) {
                    return image.getSize();
                });

            return assert.eventually.deepEqual(size, {width: 572, height: 311});
        });
    });

    describe('buildScripts', function() {
        it('should include coverage script when coverage is on', function() {
            var browser = makeBrowser({browserName: 'browser', version: '1.0'}, {coverage: true}),
                scripts = browser.buildScripts();
            return assert.eventually.include(scripts, 'exports.collectCoverage');
        });

        it('should not include coverage script when coverage is off', function() {
            var browser = makeBrowser({browserName: 'browser', version: '1.0'}, {coverage: false}),
                scripts = browser.buildScripts();
            return assert.eventually.notInclude(scripts, 'exports.collectCoverage');
        });
    });
});
