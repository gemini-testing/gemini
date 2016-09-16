'use strict';

const path = require('path');

const browserify = require('browserify');
const debug = require('debug');
const chalk = require('chalk');
const _ = require('lodash');
const polyfillService = require('polyfill-service');
const q = require('q');

const Browser = require('./browser');
const ClientBridge = require('./client-bridge');

const GeminiError = require('../errors/gemini-error');
const WdErrors = require('../constants/wd-errors');

const OPERA_NOT_SUPPORTED = 'Not supported in OperaDriver yet';

module.exports = class NewBrowser extends Browser {
    constructor(config) {
        super(config);

        this.log = debug(`gemini:browser: ${this.id}`);
        const wdLog = debug(`gemini:webdriver: ${this.id}`);

        this._wd.on('connection', (code, message) => wdLog(`Error: code ${code}, ${message}`));
        this._wd.on('status', (info) => wdLog(info));
        this._wd.on('command', (eventType, command, response) => {
            if (eventType === 'RESPONSE' && command === 'takeScreenshot()') {
                response = '<binary-data>';
            }
            if (typeof response !== 'string') {
                response = JSON.stringify(response);
            }

            wdLog(chalk.cyan(eventType), command, chalk.grey(response || ''));
        });

        this._exposeWdApi([
            'sleep',
            'waitForElementByCssSelector',
            'waitFor',
            'moveTo',
            'click',
            'doubleClick',
            'buttonDown',
            'buttonUp',
            'keys',
            'type',
            'tapElement',
            'flick',
            'execute',
            'setWindowSize',
            'getWindowSize',
            // 'setOrientation' and 'getOrientation' work only in context 'NATIVE_APP' with 'appium' below 1.5.x
            {name: 'getOrientation', context: 'NATIVE_APP'},
            {name: 'setOrientation', context: 'NATIVE_APP'}
        ]);
    }

    _exposeWdApi(methods) {
        methods
            .map((method) => _.isPlainObject(method) ? method : {name: method})
            .forEach((method) => this[method.name] = this._exposeWdMethod(method));
    }

    _exposeWdMethod(method) {
        return function() {
            return method.context
                ? this._applyWdMethodInContext(method.name, method.context, arguments)
                : this._applyWdMethod(method.name, arguments);
        };
    }

    _applyWdMethodInContext(method, context, args) {
        return this._wd.currentContext()
            .then((originalContext) => {
                return this._wd.context(context)
                    .then(() => this._applyWdMethod(method, args))
                    .finally(() => this._wd.context(originalContext));
            });
    }

    _applyWdMethod(method, args) {
        return this._wd[method].apply(this._wd, args);
    }

    launch(calibrator) {
        return this.initSession()
            .then(() => this._setDefaultSize())
            .then(() => {
                // maximize is required, because default
                // windows size in phantomjs can prevent
                // some shadows from fitting in
                if (this._shouldMaximize()) {
                    return this._maximize();
                }
            })
            .then(() => {
                if (!this.config.calibrate || this._calibration) {
                    return;
                }

                return calibrator.calibrate(this)
                    .then((calibration) => this._setCalibration(calibration));
            })
            .then(() => this._buildPolyfills())
            .then(() => this.buildScripts())
            .then(() => this.chooseLocator())
            .catch((e) => {
                if (e.code === 'ECONNREFUSED') {
                    return q.reject(new GeminiError(
                        `Unable to connect to ${this.config.gridUrl}.`,
                        'Make sure that URL in config file is correct and selenium\nserver is running.'
                    ));
                }

                const error = new GeminiError(`Cannot launch browser ${this.id}:\n${e.message}.`);

                error.browserId = this.id;
                error.sessionId = this.sessionId;

                // selenium does not provide a way to distinguish different reasons of failure
                return q.reject(error);
            });
    }

    _setSessionTimeout(timeout) {
        if (_.isNull(timeout)) {
            timeout = this.config.httpTimeout;
        }

        return this._configureHttp(timeout);
    }

    initSession() {
        return this._setSessionTimeout(this.config.sessionRequestTimeout)
            .then(() => this._wd.init(this.capabilities))
            .spread((sessionId) => {
                this.sessionId = sessionId;
                this.log('launched session %o', this);
            })
            .then(() => this._setHttpTimeout());
    }

    _setDefaultSize() {
        const size = this.config.windowSize;

        if (!size) {
            return;
        }

        return this._wd.setWindowSize(size.width, size.height)
            .catch((e) => {
                // Its the only reliable way to detect not supported operation
                // in legacy operadriver.
                const message = _.get(e, 'cause.value.message');

                if (message === OPERA_NOT_SUPPORTED) {
                    console.warn(chalk.yellow('WARNING!'));
                    console.warn('Legacy Opera Driver does not support window resizing');
                    console.warn('windowSize setting will be ignored.');
                    return;
                }

                return q.reject(e);
            });
    }

    _buildPolyfills() {
        //polyfills are needed for older browsers, namely, IE8

        return this._wd.eval('navigator.userAgent')
            .then((ua) => {
                return polyfillService.getPolyfillString({
                    uaString: ua,
                    minify: true,
                    features: {
                        'getComputedStyle': {flags: ['gated']},
                        'matchMedia': {flags: ['gated']},
                        'document.querySelector': {flags: ['gated']},
                        'String.prototype.trim': {flags: ['gated']}
                    }
                });
            })
            .then((polyfill) => this._polyfill = polyfill);
    }

    openRelative(relativeURL) {
        return this.open(this.config.getAbsoluteUrl(relativeURL));
    }

    // Zoom reset should be skipped before calibration cause we're unable to build client scripts before
    // calibration done. Reset will be executed as 1 of calibration steps.
    open(url, params) {
        params = _.defaults(params || {}, {
            resetZoom: true
        });

        return this._wd.get(url)
            .then((url) => {
                return params.resetZoom
                    ? this._clientBridge.call('resetZoom').thenResolve(url)
                    : url;
            });
    }

    injectScript(script) {
        return this._wd.execute(script);
    }

    evalScript(script) {
        return this._wd.eval(script);
    }

    buildScripts() {
        const script = browserify({
            entries: './gemini',
            basedir: path.join(__dirname, 'client-scripts')
        });

        if (!this.config.system.coverage.enabled) {
            script.exclude('./gemini.coverage');
        }

        script.transform({
            sourcemap: false,
            global: true,
            compress: {screw_ie8: false}, // eslint-disable-line camelcase
            mangle: {screw_ie8: false}, // eslint-disable-line camelcase
            output: {screw_ie8: false} // eslint-disable-line camelcase
        }, 'uglifyify');

        const queryLib = this._needsSizzle ? './query.sizzle.js' : './query.native.js';

        script.transform({
            aliases: {
                './query': {relative: queryLib}
            },
            verbose: false
        }, 'aliasify');

        return q.nfcall(script.bundle.bind(script))
            .then((buf) => {
                const scripts = this._polyfill + '\n' + buf.toString();
                this._clientBridge = new ClientBridge(this, scripts);

                return scripts;
            });
    }

    get _needsSizzle() {
        return this._calibration && !this._calibration.hasCSS3Selectors;
    }

    chooseLocator() {
        this.findElement = this._needsSizzle ? this._findElementScript : this._findElementWd;
    }

    reset() {
        // We can't use findElement here because it requires page with body tag
        return this.evalScript('document.body')
            .then(body => this._wd.moveTo(body, 0, 0))
            .catch(e => {
                return q.reject(_.extend(e || {}, {
                    browserId: this.id,
                    sessionId: this.sessionId
                }));
            });
    }

    get browserName() {
        return this.capabilities.browserName;
    }

    get version() {
        return this.capabilities.version;
    }

    get capabilities() {
        return this.config.desiredCapabilities;
    }

    _shouldMaximize() {
        if (this.config.windowSize) {
            return false;
        }

        return this.browserName === 'phantomjs';
    }

    _maximize() {
        return this._wd.windowHandle()
            .then((handle) => this._wd.maximize(handle));
    }

    findElement() {
        throw new Error('findElement is called before appropriate locator is chosen');
    }

    _findElementWd(selector) {
        return this._wd.elementByCssSelector(selector)
            .catch((error) => {
                if (error.status === WdErrors.ELEMENT_NOT_FOUND) {
                    error.selector = selector;
                }
                return q.reject(error);
            });
    }

    _findElementScript(selector) {
        return this._clientBridge.call('query.first', [selector])
            .then((element) => {
                if (element) {
                    return element;
                }

                const error = new Error('Unable to find element');
                error.status = WdErrors.ELEMENT_NOT_FOUND;
                error.selector = selector;

                return q.reject(error);
            });
    }

    prepareScreenshot(selectors, opts) {
        opts = _.extend(opts, {
            usePixelRatio: this._calibration ? this._calibration.usePixelRatio : true
        });

        return this._clientBridge.call('prepareScreenshot', [selectors, opts || {}]);
    }

    quit() {
        if (!this.sessionId) {
            return q();
        }

        return this._setSessionTimeout(this.config.sessionQuitTimeout)
            .then(() => this._wd.quit())
            .then(() => this.log('kill browser %o', this))
            .then(() => this._setHttpTimeout())
            .catch((err) => console.warn(err));
    }

    inspect() {
        return `[${this.id} (${this.sessionId})]`;
    }
};
