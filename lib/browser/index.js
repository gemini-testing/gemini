'use strict';

var inherit = require('inherit'),
    wd = require('wd'),
    q = require('q'),
    elementRect = require('../element-rect'),
    Image = require('../image'),
    Actions = require('./actions'),
    Element = require('./element'),

    GeminiError = require('../errors/gemini-error');

module.exports = inherit({
    __constructor: function(config, name, version) {
        this.name = name;
        this.version = version;
        this.config = config;
        this._browser = wd.promiseRemote(config.gridUrl);
    },

    get fullName() {
        if (!this.version) {
            return this.name;
        }
        return this.name + '-v' + this.version;
    },

    open: function(url) {
        var _this = this;
        return this._browser.init(this._capabilites)
            .then(function(capabilites) {
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
                return q.reject(e);
            });
    },

    get _capabilites() {
        return {
            browserName: this.name,
            takesScreenshot: true,
            version: this.version
        };
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

    buildElementsMap: function(staticSelectors, dynamicSelectors) {
        var _this = this;

        return this._findElements(staticSelectors)
            .then(function(elements) {
                return _this._updateDynamicElements(elements, dynamicSelectors);
            });
    },

    _findElements: function(selectorsMap, optional) {
        var _this = this;
        return q.all(Object.keys(selectorsMap).map(function(key) {
                return _this._findElement(selectorsMap[key], optional)
                    .then(function(element) {
                        return {name: key, element: element};
                    });
            }))
            .then(function(elems) {
                return elems.reduce(function(obj, elem) {
                    obj[elem.name] = elem.element;
                    return obj;
                }, {});
            });
    },

    _findElement: function(selector, optional) {
        return this._browser.elementByCssSelector(selector)
            .then(function(wdElement) {
                return new Element(selector, wdElement);
            })
            .fail(function(error) {
                if (optional && error.status === 7) { //element not found
                    return null;
                }
                return q.reject(error);
            });
    },

    captureState: function(state, elements) {
        var _this = this;
        return state.activate(this, elements)
            .then(function() {
                return _this.takeScreenshot();
            })
            .then(function(image) {
                return  _this._updateDynamicElements(elements, state.dynamicElementsSelectors)
                    .then(function(elements) {
                        return elementRect.getMultiple(elements);
                    })
                    .then(function(rect) {
                        return image.crop(rect);
                    });
            });
    },

    _updateDynamicElements: function(elements, dynamicSelectors) {
        if (!dynamicSelectors) {
            return q.resolve(elements);
        }
        return this._findElements(dynamicSelectors, true)
            .then(function(foundElements) {
                Object.keys(dynamicSelectors).forEach(function(name) {
                    if (foundElements[name]) {
                        elements[name] = foundElements[name];
                    } else {
                        elements[name] = {dynamicStub: true, name: name};
                    }
                });
                return elements;
            });
    },

    takeScreenshot: function() {
        return this._browser.takeScreenshot()
            .then(function(base64) {
                return new Image(new Buffer(base64, 'base64'));
            });
    },

    quit: function() {
        return this._browser.quit();
    },

    createActionSequence: function() {
        return new Actions(this._browser);
    }

});
