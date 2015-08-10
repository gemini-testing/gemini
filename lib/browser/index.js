'use strict';

var path = require('path'),
    util = require('util'),
    inherit = require('inherit'),
    debug = require('debug'),
    wd = require('wd'),
    q = require('q'),
    chalk = require('chalk'),
    polyfillService = require('polyfill-service'),
    browserify = require('browserify'),
    Image = require('../image'),
    Actions = require('./actions'),

    ClientBridge = require('./client-bridge'),

    GeminiError = require('../errors/gemini-error'),

    OPERA_NOT_SUPPORTED = 'Not supported in OperaDriver yet';

var Browser = inherit({
    __constructor: function(config) {
        this.config = config;
        this.id = config.id;
        this._browser = wd.promiseRemote(config.gridUrl);
        this.log = debug('gemini:browser:' + this.id);

        var wdLog = debug('gemini:webdriver:' + this.id);

        this._browser.on('connection', function(code, message, error) {
            wdLog('Error: code %d, %s', code, message);
        });

        this._browser.on('status', function(info) {
            wdLog(info);
        });
        this._browser.on('command', function(eventType, command, response) {
            if (eventType === 'RESPONSE' && command === 'takeScreenshot()') {
                response = '<binary-data>';
            }
            if (typeof response !== 'string') {
                response = JSON.stringify(response);
            }
            wdLog(chalk.cyan(eventType), command, chalk.grey(response || ''));
        });
    },

    launch: function(calibrator) {
        var _this = this;
        return this.initSession()
            .then(function() {
                return _this._setDefaultSize();
            })
            .then(function() {
                //maximize is required, because default
                //windows size in phantomjs can prevent
                //some shadows from fitting in
                if (_this._shouldMaximize()) {
                    return _this._maximize();
                }
            })
            .then(function() {
                if (!_this.config.calibrate  || _this._calibration) {
                    return;
                }
                return calibrator.calibrate(_this)
                    .then(function(result) {
                        _this._calibration = result;
                    });
            })
            .then(function() {
                return _this._buildPolyfills();
            })
            .then(function() {
                return _this.buildScripts();
            })
            .then(function() {
                return _this.chooseLocator();
            })
            .fail(function(e) {
                if (e.code === 'ECONNREFUSED') {
                    return q.reject(new GeminiError(
                        'Unable to connect to ' + _this.config.gridUrl,
                        'Make sure that URL in config file is correct and selenium\nserver is running.'
                    ));
                }
                // sadly, selenium does not provide a way to distinguish different
                // reasons of failure
                return q.reject(new GeminiError(
                    util.format('Cannot launch browser %s:\n%s', _this.id, e.message)
                ));
            });
    },

    initSession: function() {
        var _this = this;

        return this._browser
            .configureHttp({
                retries: 'never',
                timeout: this.config.httpTimeout
            })
            .then(function() {
                return _this._browser.init(_this.capabilities);
            })
            .spread(function(sessionId, actualCapabilities) {
                _this.sessionId = sessionId;
                _this.log('launched session %o', _this);
            });
    },

    _setDefaultSize: function() {
        var size = this.config.windowSize;
        if (!size) {
            return;
        }
        return this._browser.setWindowSize(size.width, size.height)
            .fail(function(e) {
                // Its the only reliable way to detect not supported operation
                // in legacy operadriver.
                var message = e.cause && e.cause.value && e.cause.value.message;
                if (message === OPERA_NOT_SUPPORTED) {
                    console.warn(chalk.yellow('WARNING!'));
                    console.warn('Legacy Opera Driver does not support window resizing');
                    console.warn('windowSize setting will be ignored.');
                    return;
                }
                return q.reject(e);
            });
    },

    _buildPolyfills: function() {
        /*jshint evil:true*/
        //polyfills are needed for older browsers, namely, IE8

        var _this = this;
        return _this._browser.eval('navigator.userAgent')
            .then(function(ua) {
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
            .then(function(polyfill) {
                _this._polyfill = polyfill;
            });
    },

    openRelative: function(relativeURL) {
        return this.open(this.config.getAbsoluteUrl(relativeURL));
    },

    open: function(url) {
        return this._browser.get(url);
    },

    injectScript: function(script) {
        return this._browser.execute(script);
    },

    evalScript: function(script) {
        /*jshint evil:true*/
        return this._browser.eval(script);
    },

    buildScripts: function() {
        var script = browserify({
                entries: './gemini',
                basedir: path.join(__dirname, 'client-scripts')
            });

        if (!this.config.system.coverage.enabled) {
            script.exclude('./gemini.coverage');
        }

        script.transform({sourcemap: false, global: true}, 'uglifyify');
        var queryLib = this._needsSizzle? './query.sizzle.js' : './query.native.js';
        script.transform({
            aliases: {
                './query': {relative: queryLib}
            },
            verbose: false
        }, 'aliasify');

        var _this = this;

        return q.nfcall(script.bundle.bind(script))
            .then(function(buf) {
                var scripts = _this._polyfill + '\n' + buf.toString();
                _this._clientBridge = new ClientBridge(_this, scripts);
                return scripts;
            });
    },

    get _needsSizzle() {
        return this._calibration && !this._calibration.hasCSS3Selectors;
    },

    chooseLocator: function() {
        this.findElement = this._needsSizzle? this._findElementScript : this._findElementWd;
    },

    reset: function() {
        var _this = this;
        // We can't use findElement here because it requires page with body tag
        return this.evalScript('document.body')
            .then(function(body) {
                // Selenium IEDriver doesn't move cursor to (0, 0) first time
                // https://github.com/SeleniumHQ/selenium/issues/672
                // So we do it in two steps: -> (1, 1) -> (0, 0)
                return _this._browser.moveTo(body, 1, 1)
                    .then(_this._browser.moveTo.bind(_this._browser, body, 0, 0));
            });
    },

    get browserName() {
        return this.capabilities.browserName;
    },

    get version() {
        return this.capabilities.version;
    },

    get capabilities() {
        return this.config.desiredCapabilities;
    },

    _shouldMaximize: function() {
        return this.browserName === 'phantomjs';
    },

    _maximize: function() {
        var _this = this;
        return _this._browser.windowHandle()
            .then(function(handle) {
                return _this._browser.maximize(handle);
            });
    },

    findElement: function(selector) {
        throw new Error('findElement is called before appropriate locator is chosen');
    },

    _findElementWd: function(selector) {
        return this._browser.elementByCssSelector(selector)
            .fail(function(error) {
                if (error.status === Browser.ELEMENT_NOT_FOUND) {
                    error.selector = selector;
                }
                return q.reject(error);
            });
    },

    _findElementScript: function(selector) {
        return this._clientBridge.call('query.first', [selector])
            .then(function(element) {
                if (element) {
                    return element;
                }

                var error = new Error('Unable to find element');
                error.status = Browser.ELEMENT_NOT_FOUND;
                error.selector = selector;
                return q.reject(error);
            });
    },

    prepareScreenshot: function(selectors, opts) {
        opts = opts || {};
        return this._clientBridge.call('prepareScreenshot', [
            selectors,
            opts
        ]);
    },

    captureFullscreenImage: function() {
        var _this = this;
        return this._browser.takeScreenshot()
            .then(function(base64) {
                var image = new Image(new Buffer(base64, 'base64'));
                if (_this._calibration) {
                    image = image.crop({
                        left: _this._calibration.left,
                        top: _this._calibration.top,
                        width: image.getSize().width - _this._calibration.left,
                        height: image.getSize().height - _this._calibration.top
                    });
                }

                return image;
            });
    },

    quit: function() {
        var _this = this;
        return this._browser
            .quit()
            .then(function() {
                _this.log('kill browser %o', _this);
            });
    },

    createActionSequence: function() {
        return new Actions(this);
    },

    inspect: function() {
        return util.format('[%s (%s)]', this.id, this.sessionId);
    }

}, {
    ELEMENT_NOT_FOUND: 7
});

module.exports = Browser;
