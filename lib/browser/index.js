'use strict';

var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    inherit = require('inherit'),
    wd = require('wd'),
    q = require('q'),
    chalk = require('chalk'),
    extend = require('node.extend'),
    polyfillService = require('polyfill-service'),
    browserify = require('browserify'),
    Image = require('../image'),
    Actions = require('./actions'),

    GeminiError = require('../errors/gemini-error'),
    StateError = require('../errors/state-error'),

    clientScriptCalibrate = fs.readFileSync(path.join(__dirname, 'client-scripts', 'gemini.calibrate.js'), 'utf8');

module.exports = inherit({
    __constructor: function(config, id, capabilities) {
        this.config = config;
        this._capabilities = capabilities;
        this.id = id;
        this._browser = wd.promiseRemote(config.gridUrl);

        // optional extra logging
        if (config.debug) {
            this._browser.on('connection', function(code, message, error) {
                console.log(chalk.red(' ! ' + code + ': ' + message));
            });
            this._browser.on('status', function(info) {
                console.log(chalk.cyan(info));
            });
            this._browser.on('command', function(eventType, command, response) {
                if (eventType === 'RESPONSE' && command === 'takeScreenshot()') {
                    response = '<binary-data>';
                }
                if (typeof response !== 'string') {
                    response = JSON.stringify(response);
                }
                console.log(' > ' + chalk.cyan(eventType), command, chalk.grey(response || ''));
            });
            this._browser.on('http', function(meth, path, data) {
                if (typeof data !== 'string') {
                    data = JSON.stringify(data);
                }
                console.log(' > ' + chalk.magenta(meth), path, chalk.grey(data || ''));
            });
        }
    },

    launch: function() {
        var _this = this;
        return this._browser
            .configureHttp(_this.config.http)
            .then(function() {
                return _this._browser.init(_this.capabilities);
            })
            .then(function() {
                if (_this.config.windowSize) {
                    return _this._browser.setWindowSize(
                        _this.config.windowSize.width,
                        _this.config.windowSize.height);
                }
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
                if (!_this._capabilities['--noCalibrate'] && !_this._calibration) {
                    return _this.calibrate();
                }
            })
            .then(function() {
                return _this._buildPolyfills();
            })
            .then(function() {
                return _this.buildScripts();
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
                        'document.querySelector': {flags: ['gated']}
                    }
                });
            })
            .then(function(polyfill) {
                _this._polyfill = polyfill;
            });
    },

    open: function(url) {
        var _this = this;
        return this._resetCursor()
            .then(function() {
                return _this._browser.get(url);
            });
    },

    injectScripts: function() {
        return this._browser.execute(this._scripts);
    },

    buildScripts: function() {
        var script = browserify({
                entries: './gemini',
                basedir: path.join(__dirname, 'client-scripts'),
                standalone: '__gemini'
            });

        if (!this.config.coverage) {
            script.exclude('./gemini.coverage');
        }

        script.transform({sourcemap: false, global: true}, 'uglifyify');

        var _this = this;

        return q.nfcall(script.bundle.bind(script))
            .then(function(buf) {
                _this._scripts = _this._polyfill + '\n' + buf.toString();
                return _this._scripts;
            });
    },

    /**
     * We need this to determine body bounds within captured screenshot for the cases like IE8 and selendroid
     * where captured image contains some area outside of the html body. The function determines what area should be
     * cropped.
     */
    calibrate: function() {
        var _this = this;
        return this._browser.get('about:blank')
            .then(function() {
                return _this._browser.execute(clientScriptCalibrate);
            })
            .then(function() {
                return _this.captureFullscreenImage();
            })
            .then(function(image) {
                var find = ['#00ff00', '#00ff00', '#00ff00', '#ff0000'];

                /**
                 * Compare pixel with given x,y to given pixel in the pattern
                 * @param {Object} coords
                 * @param {Object} positionData position data
                 * @param [Boolean] reverse should be true when traversing x from right to left
                 */
                function checkPattern(coords, positionData, reverse) {
                    if (Image.RGBToString(image.getRGBA(coords.x, coords.y)) === find[positionData.u]) {
                        if (++positionData.u === find.length) {
                            positionData.pos = {x: coords.x - (reverse? -1 : 1) * (find.length - 1), y: coords.y};
                        }

                        return;
                    }

                    positionData.u = 0;
                }

                var width = image.getSize().width,
                    height = image.getSize().height,
                    start = {u: 0},
                    end = {u: 0};

                for (var y = 0; y < height && (!start.pos || !end.pos); y++) {
                    for (var x = 0; x < width; x++) {
                        if (!start.pos) {
                            checkPattern({x: x, y: y}, start);
                        }
                        if (!end.pos) {
                            checkPattern({x: width - x - 1, y: height - y - 1}, end, true);
                        }
                    }
                }

                if (!start.pos || !end.pos) {
                    return q.reject(new GeminiError(
                        'Could not calibrate. This could be due to calibration page has failed to open properly'
                    ));
                }

                _this._calibration = {
                    top: start.pos.y,
                    left: start.pos.x,
                    right: width - 1 - end.pos.x,
                    bottom: height - 1 - end.pos.y
                };
                return _this._calibration;
            });
    },

    _resetCursor: function() {
        var _this = this;
        return this.findElement('body')
            .then(function(body) {
                return _this._browser.moveTo(body, 0, 0);
            });
    },

    get browserName() {
        return this._capabilities.browserName;
    },

    get version() {
        return this._capabilities.version;
    },

    get capabilities() {
        return extend({takesScreenshot: true}, this.config.capabilities, this._capabilities);
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

    _findElements: function(selectorsList) {
        var _this = this;
        return q.all(selectorsList.map(function(selector) {
            return _this.findElement(selector, true);
        }));
    },

    findElement: function(selector) {
        return this._browser.elementByCssSelector(selector)
            .then(function(wdElement) {
                return wdElement;
            })
            .fail(function(error) {
                if (error.status === 7) {
                    error.selector = selector;
                }
                return q.reject(error);
            });
    },

    prepareScreenshot: function(selectors, opts) {
        /*jshint evil:true*/
        var _this = this;
        opts = opts || {};
        return this._browser.eval(this._prepareScreenshotCommand(selectors, opts))
            .then(function(data) {
                if (data.error) {
                    if (data.error !== 'ERRNOFUNC') {
                        return q.reject(new StateError(data.message));
                    }

                    return _this.injectScripts()
                        .then(function() {
                            return _this.prepareScreenshot(selectors, opts);
                        });
                }
                return q.resolve(data);
            });
    },

    _prepareScreenshotCommand: function(selectors, opts) {
        return 'typeof(__gemini) !== "undefined"? __gemini.prepareScreenshot(' + JSON.stringify(selectors) + ', ' +
            JSON.stringify(opts) + ') : {error: "ERRNOFUNC"}';
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
                        width: image.getSize().width - _this._calibration.right - _this._calibration.left,
                        height: image.getSize().height - _this._calibration.bottom - _this._calibration.top
                    });
                }

                return image;
            });
    },

    quit: function() {
        return this._browser.quit();
    },

    createActionSequence: function() {
        return new Actions(this);
    }

});
