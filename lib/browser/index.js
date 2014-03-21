'use strict';

var inherit = require('inherit'),
    wd = require('wd'),
    q = require('q'),
    elementRect = require('../element-rect'),
    Image = require('../image'),
    Actions = require('./actions'),
    Element = require('./element');

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
        });
    },

    findElements: function(elements, optional) {
        var _this = this;
        return q.all(Object.keys(elements).map(function(key) {
                return _this.findElement(elements[key], optional)
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

    findElement: function(selector, optional) {
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
                return  _this._extendWithDynamicElements(elements, state.getDynamicElementsSelectors())
                    .then(function(elements) {
                        return elementRect.getMultiple(elements);
                    })
                    .then(function(rect) {
                        return image.crop(rect);
                    });
            });
    },

    _extendWithDynamicElements: function (elements, dynamicSelectors) {
        var toSearch = this._getMissingSelectors(elements, dynamicSelectors);
        return this.findElements(toSearch, true)
            .then(function(newElements) {
                Object.keys(newElements).forEach(function(name) {
                    if (newElements[name]) {
                        elements[name] = newElements[name];
                    }
                });
                return elements;
            });
    },

    _getMissingSelectors: function(elements, selectors) {
        var result = {};
        Object.keys(selectors).forEach(function(name) {
            if (!elements[name]) {
                result[name] = selectors[name];
            }

        });
        return result;
    },

    takeScreenshot: function() {
        return this._browser.takeScreenshot()
            .then(function (base64) {
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
