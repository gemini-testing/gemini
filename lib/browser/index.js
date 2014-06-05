'use strict';

var inherit = require('inherit'),
    wd = require('wd'),
    q = require('q'),
    chalk = require('chalk'),
    extend = require('node.extend'),
    elementRect = require('../element-rect'),
    Image = require('../image'),
    Actions = require('./actions'),
    Element = require('./element'),

    GeminiError = require('../errors/gemini-error'),
    StateError = require('../errors/state-error');

module.exports = inherit({
    __constructor: function(config, name, capabilities) {
        this.config = config;
        this.name = name;
        this._capabilities = capabilities;
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

    open: function(url) {
        var _this = this;
        return this._browser
            .configureHttp(_this.config.http)
            .then(function() {
                return _this._browser.init(_this.capabilities);
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
                    'Cannot launch browser ' +  _this.name,
                    'Check that browser is present on grid and its name is spelled correctly'
                ));
            });
    },

    get capabilities() {
        return extend({takesScreenshot: true}, this.config.capabilities, this._capabilities);
    },

    _shouldMaximize: function() {
        return this.capabilities.browserName === 'phantomjs';
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
                return q.all([_this._takeScreenshot(), _this._findRect(state.captureSelectors)])
                    .spread(function(image, rect) {
                        return image.crop(rect);
                    });
            })
            .fail(function(e) {
                if (e instanceof StateError) {
                    //extend error with metadata
                    e.suiteName = state.suite.name;
                    e.stateName = state.name;
                    e.browserId = _this.name;
                }
                return q.reject(e);
            }); 
    },

    _findRect: function(selectors) {
        return this._findElements(selectors)
            .then(function(elements) {
                return elementRect.getMultiple(elements);
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
