'use strict';
var Calibrator = require('../lib/calibrator'),
    Browser = require('../lib/browser'),
    ClientBridge = require('../lib/browser/client-bridge'),
    assert = require('chai').assert,
    q = require('q'),
    wd = require('wd'),
    fs = require('fs'),
    path = require('path'),
    sinon = require('sinon'),
    makeBrowser = require('./util').makeBrowser;

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
                eval: sinon.stub().returns(q('')),
                setWindowSize: sinon.stub().returns(q({})),
                on: sinon.stub()
            };

            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);
            this.calibrator = sinon.createStubInstance(Calibrator);
            this.browser = makeBrowser({
                browserName: 'browser',
                version: '1.0'
            }, {calibrate: false});

            this.launchBrowser = function() {
                return this.browser.launch(this.calibrator);
            };
        });

        it('should init browser with browserName and version capabilites', function() {
            var _this = this;
            return this.browser.launch(this.calibrator).then(function() {
                assert.calledWith(_this.wd.init, {
                    browserName: 'browser',
                    version: '1.0'
                });
            });
        });

        it('should set http options for browser instance', function() {
            var _this = this;
            this.browser.config.httpTimeout = 100;
            return this.browser.launch(this.calibrator).then(function() {
                assert.calledWith(_this.wd.configureHttp, {
                    timeout: 100,
                    retries: 'never'
                });
            });
        });

        it('should calibrate if config.calibrate=true', function() {
            var _this = this;

            this.browser.config.calibrate = true;
            this.calibrator.calibrate.returns(q());
            return this.browser.launch(this.calibrator).then(function() {
                assert.calledWith(_this.calibrator.calibrate);
            });
        });

        it('should not call calibrate() when config.calibrate=false', function() {
            var _this = this;
            this.browser.config.calibrate = false;
            return this.browser.launch(this.calibrator).then(function() {
                assert.notCalled(_this.calibrator.calibrate);
            });
        });

        describe('with windowSize option', function() {
            beforeEach(function() {
                this.browser.config.windowSize = {width: 1024, height: 768};
            });

            it('should set window size', function() {
                var _this = this;
                return this.launchBrowser().then(function() {
                    assert.calledWith(_this.wd.setWindowSize, 1024, 768);
                });
            });

            it('should not fail if not supported in legacy Opera', function() {
                this.wd.setWindowSize.returns(q.reject({
                    cause: {
                        value: {
                            message: 'Not supported in OperaDriver yet'
                        }
                    }
                }));
                return assert.isFulfilled(this.launchBrowser());
            });

            it('should fail if setWindowSize fails with other error', function() {
                this.wd.setWindowSize.returns(q.reject(new Error('other')));
                return assert.isRejected(this.launchBrowser());
            });
        });
    });

    describe('open', function() {
        beforeEach(function() {
            this.wd = {
                get: sinon.stub().returns(q({})),
                on: sinon.stub()
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
    });

    describe('openRelative', function() {
        it('should open relative URL using config', function() {
            this.wd = {
                get: sinon.stub().returns(q({})),
                on: sinon.stub()
            };

            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = makeBrowser({browserName: 'browser', version: '1.0'}, {
                getAbsoluteUrl: sinon.stub().withArgs('/relative').returns('http://example.com/relative')
            });

            var _this = this;
            return this.browser.openRelative('/relative')
                .then(function() {
                    assert.calledWith(_this.wd.get, 'http://example.com/relative');
                });
        });
    });

    describe('reset', function() {
        beforeEach(function() {
            this.wd = {
                eval: sinon.stub().returns(q()),
                moveTo: sinon.stub().returns(q()),
                on: sinon.stub()
            };

            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = makeBrowser({browserName: 'browser', version: '1.0'});
            this.browser.chooseLocator();
        });

        it('should reset mouse position', function() {
            var _this = this,
                elem = {};
            this.wd.eval.returns(q(elem));
            return this.browser.reset()
                .then(function() {
                    assert.calledWith(_this.wd.moveTo, elem, 0, 0);
                });
        });
    });

    describe('captureFullscreenImage', function() {
        it('should call to the driver', function() {
            var img = path.join(__dirname, 'functional', 'data', 'image', 'image1.png'),
                imgData = fs.readFileSync(img),
                stubWd = {
                    takeScreenshot: sinon.stub().returns(q(imgData)),
                    on: sinon.stub()
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
                takeScreenshot: sinon.stub().returns(q(imgData)),
                on: sinon.stub()
            };

            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = makeBrowser({browserName: 'browser', version: '1.0'}, {
                calibrate: true
            });
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

            return assert.eventually.deepEqual(size, {width: 574, height: 311});
        });
    });

    describe('buildScripts', function() {
        it('should include coverage script when coverage is on', function() {
            var browser = makeBrowser({browserName: 'browser', version: '1.0'}, {
                    system: {
                        coverage: {
                            enabled: true
                        }
                    }
                }),
                scripts = browser.buildScripts();
            return assert.eventually.include(scripts, 'exports.collectCoverage');
        });

        it('should not include coverage script when coverage is off', function() {
            var browser = makeBrowser({browserName: 'browser', version: '1.0'}, {
                    system: {
                        coverage: {
                            enabled: false
                        }
                    }
                }),
                scripts = browser.buildScripts();
            return assert.eventually.notInclude(scripts, 'exports.collectCoverage');
        });
    });

    describe('findElement', function() {
        beforeEach(function() {
            this.wd = {
                configureHttp: sinon.stub().returns(q()),
                init: sinon.stub().returns(q({})),
                get: sinon.stub().returns(q({})),
                eval: sinon.stub().returns(q('')),
                elementByCssSelector: sinon.stub().returns(q()),
                on: sinon.stub()
            };
            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);
            this.browser = makeBrowser({browserName: 'bro'}, {
                calibrate: true
            });
        });

        describe('when browser supports CSS3 selectors', function() {
            beforeEach(function() {
                var calibrator = sinon.createStubInstance(Calibrator);
                calibrator.calibrate.returns(q({
                    hasCSS3Selectors: true
                }));
                return this.browser.launch(calibrator);
            });

            it('should return what wd.elementByCssSelector returns', function() {
                var element = {element: 'elem'};
                this.wd.elementByCssSelector.withArgs('.class').returns(q(element));
                return assert.eventually.equal(this.browser.findElement('.class'), element);
            });

            it('should add a selector property if element is not found', function() {
                var error = new Error('Element not found');
                error.status = Browser.ELEMENT_NOT_FOUND;
                this.wd.elementByCssSelector.returns(q.reject(error));

                return assert.isRejected(this.browser.findElement('.class'))
                    .then(function(error) {
                        assert.equal(error.selector, '.class');
                    });
            });
        });

        describe('when browser does not support CSS3 selectors', function() {
            beforeEach(function() {
                this.sinon.stub(ClientBridge.prototype, 'call').returns(q({}));
                var calibrator = sinon.createStubInstance(Calibrator);
                calibrator.calibrate.returns(q({
                    hasCSS3Selectors: false
                }));
                return this.browser.launch(calibrator);
            });

            it('should return what client method returns', function() {
                var element = {element: 'elem'};
                ClientBridge.prototype.call.withArgs('query.first', ['.class']).returns(q(element));
                return assert.eventually.equal(this.browser.findElement('.class'), element);
            });

            it('should reject with element not found error if client method returns null', function() {
                ClientBridge.prototype.call.returns(q(null));
                return assert.isRejected(this.browser.findElement('.class'))
                    .then(function(error) {
                        assert.equal(error.status, Browser.ELEMENT_NOT_FOUND);
                        assert.equal(error.selector, '.class');
                    });
            });
        });
    });
});
