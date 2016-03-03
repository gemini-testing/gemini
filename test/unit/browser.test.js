'use strict';
var Calibrator = require('../../lib/calibrator'),
    Browser = require('../../lib/browser'),
    ClientBridge = require('../../lib/browser/client-bridge'),
    q = require('q'),
    wd = require('wd'),
    fs = require('fs'),
    path = require('path'),
    polyfillService = require('polyfill-service'),
    makeBrowser = require('../util').makeBrowser;

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
                maximize: sinon.stub().returns(q()),
                windowHandle: sinon.stub().returns(q({})),
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

        it('should maximize window if launching phantomjs', function() {
            var _this = this;

            this.browser = makeBrowser({
                browserName: 'phantomjs',
                version: '1.0'
            }, {calibrate: false});

            return this.launchBrowser().then(function() {
                assert.called(_this.wd.maximize);
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

            it('should not maximize window', function() {
                var _this = this;
                return this.launchBrowser().then(function() {
                    assert.notCalled(_this.wd.maximize);
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

    describe('URL opening', function() {
        beforeEach(function() {
            this.wd = {
                configureHttp: sinon.stub().returns(q({})),
                eval: sinon.stub().returns(q({})),
                get: sinon.stub().returns(q({})),
                init: sinon.stub().returns(q({})),
                on: sinon.stub(),
                setWindowSize: sinon.stub().returns(q({}))
            };

            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);
            this.sinon.stub(ClientBridge.prototype, 'call').returns(q({}));
            this.sinon.stub(polyfillService, 'getPolyfillString').returns('function() {}');
        });

        describe('open', function() {
            function open_(browser, params) {
                params = params || {};

                return browser.launch()
                    .then(function() {
                        return browser.open(
                            params.url || 'http://www.example.com',
                            params.shouldSkipZoomReset
                        );
                    });
            }

            beforeEach(function() {
                this.browser = makeBrowser({browserName: 'browser', version: '1.0'});
            });

            it('should open URL', function() {
                var _this = this;

                return open_(this.browser, {url: 'http://www.example.com'})
                    .then(function() {
                        assert.calledWith(_this.wd.get, 'http://www.example.com');
                    });
            });

            it('should reset page zoom by default', function() {
                return open_(this.browser, {url: 'http://www.example.com'})
                    .then(function() {
                        assert.calledWith(ClientBridge.prototype.call, 'resetZoom');
                    });
            });

            it('should not reset page zoom if `shouldSkipZoomReset` param passed as true', function() {
                return open_(this.browser, {url: 'http://www.example.com', shouldSkipZoomReset: true})
                    .then(function() {
                        assert.neverCalledWith(ClientBridge.prototype.call, 'resetZoom');
                    });
            });
        });

        describe('openRelative', function() {
            beforeEach(function() {
                this.browser = makeBrowser({browserName: 'browser', version: '1.0'}, {
                    getAbsoluteUrl: sinon.stub().withArgs('/relative').returns('http://example.com/relative')
                });
            });

            it('should open relative URL using config', function() {
                var _this = this;
                return this.browser.launch()
                    .then(function() {
                        return _this.browser.openRelative('/relative');
                    })
                    .then(function() {
                        assert.calledWith(_this.wd.get, 'http://example.com/relative');
                    });
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

        it('should reject promise with browserId and sessionId if error happened', function() {
            this.browser.sessionId = 'test_session_id';
            this.wd.eval.returns(q.reject());

            return this.browser.reset()
                .fail(function(e) {
                    assert.deepEqual(e, {
                        browserId: 'id',
                        sessionId: 'test_session_id'
                    });
                });
        });
    });

    describe('captureFullscreenImage', function() {
        beforeEach(function() {
            var img = path.join(__dirname, '..', 'functional', 'data', 'image', 'image1.png'),
                imgData = fs.readFileSync(img);

            this.stubWd = {
                takeScreenshot: sinon.stub().returns(q(imgData)),
                currentContext: sinon.stub().returns(q()),
                context: sinon.stub().returns(q()),
                on: sinon.stub()
            };

            this.sinon.stub(wd, 'promiseRemote').returns(this.stubWd);
        });

        it('should call to the driver', function() {
            var _this = this,
                browser = makeBrowser();
            return browser.captureFullscreenImage().then(function() {
                assert.calledOnce(_this.stubWd.takeScreenshot);
            });
        });

        it('should not switch appium context', function() {
            var _this = this,
                browser = makeBrowser();

            return browser.captureFullscreenImage().then(function() {
                assert.notCalled(_this.stubWd.context);
            });
        });

        it('should not switch appium context if capture succeeds for the first, but fails for the second time', function() {
            var _this = this,
                browser = makeBrowser(),
                error = new Error('not today');

            this.stubWd.takeScreenshot
                .onSecondCall().returns(q.reject(error));

            var result = browser.captureFullscreenImage()
                .then(function() {
                    return browser.captureFullscreenImage();
                });

            return assert.isRejected(result, error)
                .then(function() {
                    assert.notCalled(_this.stubWd.context);
                });
        });

        it('should try to switch appium context if taking screenshot fails', function() {
            var _this = this,
                browser = makeBrowser();
            this.stubWd.takeScreenshot
                .onFirstCall().returns(q.reject(new Error('not today')));

            return browser.captureFullscreenImage().then(function() {
                assert.calledWithExactly(_this.stubWd.context, 'NATIVE_APP');
            });
        });

        it('should try to take screenshot after switching context', function() {
            var _this = this,
                browser = makeBrowser();
            this.stubWd.takeScreenshot
                .onFirstCall().returns(q.reject(new Error('not today')));

            return browser.captureFullscreenImage().then(function() {
                assert.calledTwice(_this.stubWd.takeScreenshot);
            });
        });

        it('should restore original context after taking screenshot', function() {
            var _this = this,
                browser = makeBrowser();
            this.stubWd.currentContext.returns(q('Original'));
            this.stubWd.takeScreenshot
                .onFirstCall().returns(q.reject(new Error('not today')));

            return browser.captureFullscreenImage().then(function() {
                assert.calledWithExactly(_this.stubWd.context, 'Original');
            });
        });

        it('should fail with original error if switching context does not helps', function() {
            var browser = makeBrowser(),
                originalError = new Error('Original');

            this.stubWd.takeScreenshot
                .onFirstCall().returns(q.reject(originalError))
                .onSecondCall().returns(q.reject(new Error('still does not work')));

            return assert.isRejected(browser.captureFullscreenImage(), originalError);
        });

        it('should not try to take screenshot without switching context if it failed first time', function() {
            var _this = this,
                browser = makeBrowser(),
                error = new Error('not today');

            this.stubWd.takeScreenshot
                .onFirstCall().returns(q.reject(error))
                .onThirdCall().returns(q.reject(error));

            return assert.isRejected(browser.captureFullscreenImage()
                .then(function() {
                    return browser.captureFullscreenImage();
                }))
                .then(function() {
                    assert.calledThrice(_this.stubWd.takeScreenshot);
                });
        });
    });

    describe('calibration', function() {
        beforeEach(function() {
            var img = path.join(__dirname, '..', 'functional', 'data', 'image', 'calibrate.png'),
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
                    calibrate: sinon.stub().returns(q({top: 6, left: 4}))
                };

            var size = this.browser.launch(calibrator)
                .then(function() {
                    return _this.browser.captureFullscreenImage();
                })
                .then(function(image) {
                    return image.getSize();
                });

            return assert.eventually.deepEqual(size, {width: 1000, height: 13});
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
