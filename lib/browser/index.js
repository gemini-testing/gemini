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
    __constructor: function(config, name) {
        this.name = name;
        this.config = config;
        this._browser = wd.promiseRemote(config.gridUrl);
    },

    open: function(url) {
        var _this = this;
        return this._browser.init({browserName: this.name}).then(function() {
            return _this._browser.get(url);
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
                return new Element(wdElement);
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
                return  _this._updateDynamicElements(elements, state.getDynamicElementsSelectors())
                    .then(function(elements) {
                        return elementRect.getMultiple(elements);
                    })
                    .then(function(rect) {
                        return image.crop(rect);
                    });
            });
    },

    _updateDynamicElements: function(elements, dynamicSelectors) {
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
