'use strict';

const Promise = require('bluebird');
const wdAgent = require('wd');
const _ = require('lodash');

const Camera = require('lib/browser/camera');
const ClientBridge = require('lib/browser/client-bridge');
const Calibrator = require('lib/calibrator');
const WdErrors = require('lib/constants/wd-errors');
const GeminiError = require('lib/errors/gemini-error');

const makeBrowser = require('../../util').makeBrowser;

describe('browser/new-browser', () => {
    const sandbox = sinon.sandbox.create();

    let wd;

    beforeEach(() => {
        wd = {
            configureHttp: sinon.stub().returns(Promise.resolve()),
            init: sinon.stub().returns(Promise.resolve([])),
            get: sinon.stub().returns(Promise.resolve({})),
            eval: sinon.stub().returns(Promise.resolve('')),
            setWindowSize: sinon.stub().returns(Promise.resolve({})),
            maximize: sinon.stub().returns(Promise.resolve()),
            windowHandle: sinon.stub().returns(Promise.resolve({})),
            moveTo: sinon.stub().returns(Promise.resolve()),
            elementByCssSelector: sinon.stub().returns(Promise.resolve()),
            on: sinon.stub(),
            currentContext: sinon.stub().returns(Promise.resolve()),
            context: sinon.stub().returns(Promise.resolve()),
            quit: sinon.stub().returns(Promise.resolve())
        };

        sandbox.stub(wdAgent, 'promiseRemote').returns(wd);
    });

    afterEach(() => sandbox.restore());

    describe('properties', () => {
        it('should have browserName property', () => {
            const browser = makeBrowser({browserName: 'name'});

            assert.equal(browser.browserName, 'name');
        });

        it('should have version propery', () => {
            const browser = makeBrowser({version: '1.0'});

            assert.equal(browser.version, '1.0');
        });
    });

    describe('should expose wd API', () => {
        const testExposedWdMethod = (method) => {
            wd[method] = sinon.stub().returns(Promise.resolve('awesome-res'));

            return makeBrowser()[method]('firstArg', 'secondArg')
                .then((res) => {
                    assert.calledWith(wd[method], 'firstArg', 'secondArg');
                    assert.equal(res, 'awesome-res');
                });
        };

        [
            'sleep', 'waitForElementByCssSelector', 'waitForElementByCssSelector', 'waitFor', 'moveTo',
            'click', 'doubleclick', 'buttonDown', 'buttonUp', 'keys', 'type', 'tapElement', 'execute',
            'setWindowSize', 'getWindowSize', 'getOrientation', 'setOrientation'
        ].forEach((method) => it(method, () => testExposedWdMethod(method)));

        describe('getOrientation', () => {
            beforeEach(() => wd.getOrientation = sinon.stub());

            it('should be applied in context `NATIVE_APP`', () => {
                const context = wd.context.withArgs('NATIVE_APP').named('context');

                return makeBrowser().getOrientation()
                    .then(() => assert.callOrder(context, wd.getOrientation));
            });

            it('should restore original context after applying', () => {
                wd.currentContext.returns(Promise.resolve('ORIGINAL_CONTEXT'));

                const context = wd.context.withArgs('ORIGINAL_CONTEXT').named('context');

                return makeBrowser().getOrientation()
                    .then(() => assert.callOrder(wd.getOrientation, context));
            });
        });

        describe('setOrientation', () => {
            beforeEach(() => wd.setOrientation = sinon.stub());

            it('should be applied in context `NATIVE_APP`', () => {
                const context = wd.context.withArgs('NATIVE_APP').named('context');

                return makeBrowser().setOrientation()
                    .then(() => assert.callOrder(context, wd.setOrientation));
            });

            it('should restore original context after applying', () => {
                wd.currentContext.returns(Promise.resolve('ORIGINAL_CONTEXT'));

                const context = wd.context.withArgs('ORIGINAL_CONTEXT').named('context');

                return makeBrowser().setOrientation()
                    .then(() => assert.callOrder(wd.setOrientation, context));
            });
        });
    });

    describe('launch', () => {
        let calibrator;
        let browser;
        let launchBrowser;

        beforeEach(() => {
            calibrator = sinon.createStubInstance(Calibrator);

            browser = makeBrowser({browserName: 'browser', version: '1.0'}, {calibrate: false});

            launchBrowser = () => browser.launch(calibrator);

            sandbox.stub(Camera.prototype, 'calibrate');
        });

        it('should init browser with browserName and version capabilites', () => {
            return browser.launch(calibrator)
                .then(() => assert.calledWith(wd.init, {browserName: 'browser', version: '1.0'}));
        });

        it('should set http options for browser instance', () => {
            browser.config.httpTimeout = 100;

            return browser.launch(calibrator)
                .then(() => assert.calledWith(wd.configureHttp, {timeout: 100, retries: 'never'}));
        });

        describe('if config.calibrate=true', () => {
            beforeEach(() => browser.config.calibrate = true);

            it('should calibrate', () => {
                calibrator.calibrate.returns(Promise.resolve());

                return browser.launch(calibrator)
                    .then(() => assert.calledOnce(calibrator.calibrate));
            });

            it('should calibrate camera object', () => {
                const calibration = {some: 'data'};

                calibrator.calibrate.returns(Promise.resolve(calibration));

                return browser.launch(calibrator)
                    .then(() => {
                        assert.calledOnce(Camera.prototype.calibrate);
                        assert.calledWith(Camera.prototype.calibrate, calibration);
                    });
            });
        });

        describe('if config.calibrate=false', () => {
            beforeEach(() => browser.config.calibrate = false);

            it('should not calibrate', () => {
                return browser.launch(calibrator)
                    .then(() => assert.notCalled(calibrator.calibrate));
            });

            it('should not calibrate camera object', () => {
                return browser.launch(calibrator)
                    .then(() => assert.notCalled(Camera.prototype.calibrate));
            });
        });

        it('should maximize window if launching phantomjs', () => {
            browser = makeBrowser({browserName: 'phantomjs', version: '1.0'}, {calibrate: false});

            return launchBrowser().then(() => assert.called(wd.maximize));
        });

        describe('with windowSize option', () => {
            beforeEach(() => browser.config.windowSize = {width: 1024, height: 768});

            it('should set window size', () => {
                return launchBrowser().then(() => assert.calledWith(wd.setWindowSize, 1024, 768));
            });

            it('should not maximize window', () => {
                return launchBrowser().then(() => assert.notCalled(wd.maximize));
            });

            it('should not fail if not supported in legacy Opera', () => {
                wd.setWindowSize.returns(Promise.reject({cause: {value: {message: 'Not supported in OperaDriver yet'}}}));

                return assert.isFulfilled(launchBrowser());
            });

            it('should fail if setWindowSize fails with other error', () => {
                wd.setWindowSize.returns(Promise.reject(new Error('other')));

                return assert.isRejected(launchBrowser());
            });
        });

        describe('catch error on wd init', () => {
            it('should fail if wd init fails', () => {
                wd.init.returns(Promise.reject(new Error('o.O')));

                return assert.isRejected(launchBrowser());
            });

            it('should fail with GeminiError instance', () => {
                wd.init.returns(Promise.reject({message: 'defaultError'}));

                return assert.isRejected(launchBrowser(), GeminiError);
            });

            it('should fail with the error message by default', () => {
                wd.init.returns(Promise.reject({message: 'error text'}));

                return launchBrowser()
                    .catch((e) => assert.include(e.message, 'error text'));
            });

            it('should extend error message with error data if it exists', () => {
                wd.init.returns(Promise.reject({data: 'error text'}));

                return launchBrowser()
                    .catch((e) => assert.include(e.message, 'error text'));
            });

            it('should not add to the message fail reason if error data does not exists', () => {
                wd.init.returns(Promise.reject({message: 'defaultError'}));

                return launchBrowser()
                    .catch((e) => assert.notInclude(e.message, 'Reason'));
            });

            it('should cut all tags from error', () => {
                wd.init.returns(Promise.reject({data: '<title></title><body><h1>Error</h1> text</body>'}));

                return launchBrowser()
                    .catch((e) => {
                        assert.notInclude(e.message, '<title>');
                        assert.notInclude(e.message, '<body>');
                        assert.notInclude(e.message, '<h1>');
                    });
            });

            it('should skip text from all tags except body', () => {
                wd.init.returns(Promise.reject({data: '<title>4xx</title><body>Error</body>'}));

                return launchBrowser()
                    .catch((e) => assert.notInclude(e.message, '4xx'));
            });

            it('should not skip text from internal tags in body tag', () => {
                wd.init.returns(Promise.reject({data: '<body><h1>Error</h1> text</body>'}));

                return launchBrowser()
                    .catch((e) => assert.include(e.message, 'Error text'));
            });

            it('should replace newlines to spaces', () => {
                wd.init.returns(Promise.reject({data: '<body>Error\ntext</body>'}));

                return launchBrowser()
                    .catch((e) => assert.include(e.message, 'Error text'));
            });

            it('should fail with full html if <body> tag is empty', () => {
                wd.init.returns(Promise.reject({data: '<html><body></body></html>'}));

                return launchBrowser()
                    .catch((e) => assert.include(e.message, '<html><body></body></html>'));
            });
        });
    });

    describe('URL opening', () => {
        let browser;

        beforeEach(() => {
            sandbox.stub(ClientBridge.prototype, 'call').returns(Promise.resolve({}));
        });

        describe('open', () => {
            const open = (browser, params) => {
                params = params || {};

                return browser.launch()
                    .then(() => browser.open(params.url || 'http://www.example.com', {resetZoom: params.resetZoom}));
            };

            beforeEach(() => {
                browser = makeBrowser({browserName: 'browser', version: '1.0'});
            });

            it('should open URL', () => {
                return open(browser, {url: 'http://www.example.com'})
                    .then(() => assert.calledWith(wd.get, 'http://www.example.com'));
            });

            it('should reset page zoom by default', () => {
                return open(browser, {url: 'http://www.example.com'})
                    .then(() => assert.calledWith(ClientBridge.prototype.call, 'resetZoom'));
            });

            it('should not reset page zoom if `resetZoom` param passed as false', () => {
                return open(browser, {url: 'http://www.example.com', resetZoom: false})
                    .then(() => assert.neverCalledWith(ClientBridge.prototype.call, 'resetZoom'));
            });
        });

        describe('openRelative', () => {
            beforeEach(() => {
                browser = makeBrowser({browserName: 'browser', version: '1.0'}, {
                    getAbsoluteUrl: sinon.stub().withArgs('/relative').returns('http://example.com/relative')
                });
            });

            it('should open relative URL using config', () => {
                return browser.launch()
                    .then(() => browser.openRelative('/relative'))
                    .then(() => assert.calledWith(wd.get, 'http://example.com/relative'));
            });
        });
    });

    describe('reset', () => {
        let browser;

        beforeEach(() => {
            browser = makeBrowser({browserName: 'browser', version: '1.0'});

            browser.chooseLocator();
        });

        it('should reset mouse position', () => {
            const elem = {};

            wd.eval.returns(Promise.resolve(elem));

            return browser.reset().then(() => assert.calledWith(wd.moveTo, elem, 0, 0));
        });

        it('should reject promise with browserId and sessionId if error happened', () => {
            browser.sessionId = 'test_session_id';
            wd.eval.returns(Promise.reject());

            return browser.reset()
                .catch((e) => assert.deepEqual(e, {browserId: 'id', sessionId: 'test_session_id'}));
        });
    });

    describe('prepareScreenshot', () => {
        beforeEach(() => {
            sandbox.stub(ClientBridge.prototype, 'call').returns(Promise.resolve({}));
        });

        const launchBrowser_ = (opts) => {
            opts = opts || {};
            const config = _.extend(opts.config, {
                calibrate: Boolean(opts.calibrator)
            });
            const browser = makeBrowser({}, config);

            return browser.launch(opts.calibrator)
                .then(() => browser);
        };

        it('should prepare screenshot on client', () => {
            return launchBrowser_()
                .then((browser) => browser.prepareScreenshot(['some-selector'], {some: 'opt'}))
                .then(() => {
                    assert.calledOnce(ClientBridge.prototype.call);
                    assert.calledWith(ClientBridge.prototype.call, 'prepareScreenshot');

                    const selectors = ClientBridge.prototype.call.firstCall.args[1][0];
                    assert.deepEqual(selectors, ['some-selector']);

                    const opts = ClientBridge.prototype.call.firstCall.args[1][1];
                    assert.match(opts, {some: 'opt'});
                });
        });

        it('should use pixel ratio by default', () => {
            return launchBrowser_()
                .then((browser) => browser.prepareScreenshot())
                .then(() => {
                    const opts = ClientBridge.prototype.call.firstCall.args[1][1];
                    assert.match(opts, {usePixelRatio: true});
                });
        });

        it('should use calibration pixel ratio if any', () => {
            const calibrator = sinon.createStubInstance(Calibrator);
            calibrator.calibrate.returns(Promise.resolve({usePixelRatio: false}));

            return launchBrowser_({calibrator})
                .then((browser) => browser.prepareScreenshot())
                .then(() => {
                    const opts = ClientBridge.prototype.call.firstCall.args[1][1];
                    assert.match(opts, {usePixelRatio: false});
                });
        });

        it('should enable coverage if it is enabled in config', () => {
            const config = {system: {coverage: {enabled: true}}};

            return launchBrowser_({config})
                .then((browser) => browser.prepareScreenshot())
                .then(() => {
                    const opts = ClientBridge.prototype.call.firstCall.args[1][1];
                    assert.match(opts, {coverage: true});
                });
        });
    });

    describe('captureViewportImage', () => {
        beforeEach(() => {
            sandbox.stub(Camera.prototype, 'captureViewportImage');
            sandbox.stub(Promise, 'delay').returns(Promise.resolve());
        });

        it('should delay capturing by the configured amount', () => {
            const browser = makeBrowser({browserName: 'browser', version: '1.0'}, {calibrate: false, screenshotDelay: 42});

            return browser.launch()
                .then(() => browser.captureViewportImage())
                .then(() => {
                    assert.calledOnce(Promise.delay);
                    assert.calledWith(Promise.delay, 42);
                    assert.callOrder(Promise.delay, Camera.prototype.captureViewportImage);
                });
        });

        it('should delegate actual capturing to camera object', () => {
            const browser = makeBrowser({browserName: 'browser', version: '1.0'}, {calibrate: false});

            Camera.prototype.captureViewportImage.returns(Promise.resolve({some: 'image'}));

            return browser.launch()
                .then(() => browser.captureViewportImage())
                .then((image) => {
                    assert.calledOnce(Camera.prototype.captureViewportImage);
                    assert.deepEqual(image, {some: 'image'});
                });
        });
    });

    describe('buildScripts', () => {
        it('should include coverage script when coverage is on', () => {
            const browser = makeBrowser({browserName: 'browser', version: '1.0'},
                {system: {coverage: {enabled: true}}});
            const scripts = browser.buildScripts();

            return assert.eventually.include(scripts, 'exports.collectCoverage');
        });

        it('should not include coverage script when coverage is off', () => {
            const browser = makeBrowser({browserName: 'browser', version: '1.0'},
                {system: {coverage: {enabled: false}}});
            const scripts = browser.buildScripts();

            return assert.eventually.notInclude(scripts, 'exports.collectCoverage');
        });
    });

    describe('findElement', () => {
        let browser;
        let calibrator;

        beforeEach(() => {
            browser = makeBrowser({browserName: 'bro'}, {calibrate: true});
            calibrator = sinon.createStubInstance(Calibrator);
        });

        describe('in modern browser', () => {
            beforeEach(() => {
                calibrator.calibrate.returns(Promise.resolve({needsCompatLib: false}));

                return browser.launch(calibrator);
            });

            it('should return what wd.elementByCssSelector returns', () => {
                const element = {element: 'elem'};

                wd.elementByCssSelector.withArgs('.class').returns(Promise.resolve(element));

                return assert.eventually.equal(browser.findElement('.class'), element);
            });

            it('should add a selector property if element is not found', () => {
                const error = new Error('Element not found');
                error.status = WdErrors.ELEMENT_NOT_FOUND;

                wd.elementByCssSelector.returns(Promise.reject(error));

                return assert.isRejected(browser.findElement('.class'))
                    .then((error) => assert.equal(error.selector, '.class'));
            });
        });

        describe('in legacy browser', () => {
            beforeEach(() => {
                sandbox.stub(ClientBridge.prototype, 'call').returns(Promise.resolve({}));

                calibrator.calibrate.returns(Promise.resolve({needsCompatLib: true}));

                return browser.launch(calibrator);
            });

            it('should return what client method returns', () => {
                const element = {element: 'elem'};

                ClientBridge.prototype.call.withArgs('queryFirst', ['.class']).returns(Promise.resolve(element));

                return assert.eventually.equal(browser.findElement('.class'), element);
            });

            it('should reject with element not found error if client method returns null', () => {
                ClientBridge.prototype.call.returns(Promise.resolve(null));

                return assert.isRejected(browser.findElement('.class'))
                    .then((error) => {
                        assert.equal(error.status, WdErrors.ELEMENT_NOT_FOUND);
                        assert.equal(error.selector, '.class');
                    });
            });
        });
    });

    describe('serialize', () => {
        it('should add config with browser id, gridUrl and httpTimeout to object', () => {
            const browser = makeBrowser({}, {
                id: 'someBrowser',
                gridUrl: 'http://grid.url',
                httpTimeout: 100500,
                screenshotMode: 'viewport',
                some: 'otherProperty'
            });

            const obj = browser.serialize();

            assert.deepEqual(obj.config, {
                id: 'someBrowser',
                gridUrl: 'http://grid.url',
                httpTimeout: 100500,
                screenshotMode: 'viewport'
            });
        });

        it('should add sessionId to object', () => {
            const browser = makeBrowser();
            browser.sessionId = 'some-session-id';

            const obj = browser.serialize();

            assert.property(obj, 'sessionId', 'some-session-id');
        });

        it('should add calibration results to object', () => {
            const calibrator = sinon.createStubInstance(Calibrator);
            calibrator.calibrate.returns(Promise.resolve({some: 'data'}));

            const browser = makeBrowser({}, {calibrate: true});
            return browser.launch(calibrator)
                .then(() => {
                    const obj = browser.serialize();

                    assert.deepEqual(obj.calibration, {some: 'data'});
                });
        });
    });

    describe('initSession', () => {
        const settingOfTimeout = (timeout) =>
            wd.configureHttp.withArgs({retries: 'never', timeout}).named('configureHttp');

        it('should init a browser session', () => {
            return makeBrowser({browserName: 'some-browser'})
                .initSession()
                .then(() => assert.calledWith(wd.init, {browserName: 'some-browser'}));
        });

        it('should set session id after getting of a session', () => {
            wd.init.returns(Promise.resolve(['100500']));

            const browser = makeBrowser();
            return browser.initSession()
                .then(() => assert.equal(browser.sessionId, '100500'));
        });

        it('should set session request timeout before getting of a session', () => {
            return makeBrowser(null, {sessionRequestTimeout: 100500})
                .initSession()
                .then(() => assert.callOrder(settingOfTimeout(100500), wd.init));
        });

        it('should use http timeout for getting of a session if request session timeout is not specified', () => {
            return makeBrowser(null, {httpTimeout: 100500, sessionRequestTimeout: null})
                .initSession()
                .then(() => assert.callOrder(settingOfTimeout(100500), wd.init));
        });

        it('should set http timeout for all other requests after getting of a session', () => {
            return makeBrowser(null, {httpTimeout: 100500})
                .initSession()
                .then(() => assert.callOrder(wd.init, settingOfTimeout(100500)));
        });
    });

    describe('quit', () => {
        const settingOfTimeout = (timeout) =>
            wd.configureHttp.withArgs({retries: 'never', timeout}).named('configureHttp');

        const mkBrowser_ = (config, sessionId) => {
            const browser = makeBrowser(null, config);
            browser.sessionId = sessionId;

            return browser;
        };

        it('should return empty promise if browser session id is not set', () => {
            const browser = mkBrowser_();

            sinon.spy(browser, 'quit');

            return browser.quit()
                .then(() => assert.eventually.isUndefined(browser.quit.getCall(0).returnValue));
        });

        it('should not close browser session without session id', () => {
            const browser = mkBrowser_();

            return browser.quit()
                .then(() => assert.notCalled(wd.quit));
        });

        it('should close browser session with given session id', () => {
            const browser = mkBrowser_(null, 'some-session-id');

            return browser.quit()
                .then(() => assert.called(wd.quit));
        });

        it('should set session quit timeout before closing session', () => {
            const browser = mkBrowser_({sessionQuitTimeout: 100500}, 'some-session-id');

            return browser.quit()
                .then(() => assert.callOrder(settingOfTimeout(100500), wd.quit));
        });

        it('should fall back to "http timeout" value', () => {
            const browser = mkBrowser_({httpTimeout: 100500, sessionQuitTimeout: null}, 'some-session-id');

            return browser.quit()
                .then(() => assert.callOrder(settingOfTimeout(100500), wd.quit));
        });

        it('should set http timeout for all other requests after closing a session', () => {
            const browser = mkBrowser_({httpTimeout: 100500}, 'some-session-id');

            return browser.quit()
                .then(() => assert.callOrder(wd.quit, settingOfTimeout(100500)));
        });
    });
});
