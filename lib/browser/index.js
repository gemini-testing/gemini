'use strict';

var inherit = require('inherit'),
    wd = require('wd'),
    q = require('q'),
    elementRect = require('../element-rect'),
    Image = require('../image'),
    Actions = require('./actions');

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

    findElements: function(elements) {
        var _this = this;
        return q.all(Object.keys(elements).map(function(key) {
                return _this.findElement(elements[key])
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

    findElement: function(selector) {
        return this._browser.elementByCssSelector(selector);
    },

    captureState: function(state, elements) {
        var _this = this;
        return state.activate(this, elements)
            .then(function() {
                return _this.takeScreenshot();
            })
            .then(function(image) {
                return elementRect.getMultiple(elements)
                    .then(function(rect) {
                        return image.crop(rect);
                    });
            });
    },

    oldCaptureState: function (state) {
        var _this = this;
        return this.open(this.config.getAbsoluteUrl(state.getUrl()))
            .then(function() {
                return _this.findElements(state.getElementsSelectors());
            })
            .then(function(elements) {
                return state.activate(_this, elements)
                    .then(function() {
                        return _this.takeScreenshot();
                    })
                    .then(function(image) {
                        return elementRect.getMultiple(elements)
                            .then(function(rect) {
                                return image.crop(rect);
                            });
                    });
            });

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
