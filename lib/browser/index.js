'use strict';

var inherit = require('inherit'),
    wd = require('wd'),
    q = require('q'),
    chalk = require('chalk'),
    elementRect = require('../element-rect'),
    Image = require('../image'),
    Actions = require('./actions'),
    Element = require('./element'),

    GeminiError = require('../errors/gemini-error'),
    StateError = require('../errors/state-error');

module.exports = inherit({
    __constructor: function(config, name, version) {
        this.name = name;
        this.version = version;
        this.config = config;
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
                if (eventType === 'RESPONSE' && command == 'takeScreenshot()') {
                    response = '<binary-data>';
                }
                console.log(' > ' + chalk.cyan(eventType), command, chalk.grey(response || ''));
            });
            this._browser.on('http', function(meth, path, data) {
                console.log(' > ' + chalk.magenta(meth), path, chalk.grey(data || ''));
            });
        }
    },

    get fullName() {
        if (!this.version) {
            return this.name;
        }
        return this.name + '-v' + this.version;
    },

    open: function(url) {
        var _this = this;
        return this._browser
            .configureHttp(_this.config.http)
            .then(function() {
                return _this._browser.init(_this._capabilities)
            })
            .then(function(capabilities) {
                return _this._browser.get(url);
            })
            .then(function() {
                //maximize is required, because default
                //windows size in phantomjs can prevent
                //some shadows from fitting in
                if (_this._shouldMaximize()) {
                    return _this._maximize();
                }
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
                    'Cannot launch browser ' +  _this.fullName,
                    'Check that browser is present on grid and its name is spelled correctly'
                ));
            });
    },

    get _capabilities() {
        var result = {
            browserName: this.name,
            takesScreenshot: true,
            version: this.version
        };

        Object.keys(this.config.capabilities).forEach(function(key) {
            result[key] = this.config.capabilities[key];
        }, this);

        return result;
    },

    _shouldMaximize: function() {
        return this.name === 'phantomjs';
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
                return new Element(selector, wdElement);
            })
            .fail(function(error) {
                if (error.status === 7) {
                    error.selector = selector; 
                }
                return q.reject(error);
            });
    },

    captureState: function(state, context) {
        var _this = this;
        return state.activate(this, context)
            .then(function() {
                return _this._takeScreenshot();
            })
            .then(function(image) {
                return _this._findElements(state.captureSelectors)
                    .then(function(elements) {
                        return elementRect.getMultiple(elements);
                    })
                    .then(function(rect) {
                        return image.crop(rect);
                    });
            })
            .fail(function(error) {
                if (error.status === 7) {
                    return q.reject(new StateError('Could not find element with css selector: ' + error.selector, {
                        suiteName: state.suite.name,
                        stateName: state.name,
                        browserName: _this.fullName
                    }));
                }
                return q.reject(error);
            });
    },

    _takeScreenshot: function() {
        return this._browser.takeScreenshot()
            .then(function(base64) {
                return new Image(new Buffer(base64, 'base64'));
            });
    },

    quit: function() {
        return this._browser.quit();
    },

    createActionSequence: function() {
        return new Actions(this);
    }

});
