'use strict';

var inherit = require('inherit'),
    webdriver = require('selenium-webdriver'),
    elementRect = require('../element-rect'),
    Image = require('../image'),
    Actions = require('./actions'),
    By = webdriver.By;

module.exports = inherit({
    __constructor: function(config, name) {
        this.name = name;
        this.config = config;
        var builder = new webdriver.Builder();

        if (config.gridUrl) {
            builder.usingServer(config.gridUrl);
        }

        var capabilities = webdriver.Capabilities[name];

        this._driver = builder
            .withCapabilities(capabilities())
            .build();
    },

    open: function(url) {
        return this._driver.get(url);
    },

    findElements: function(elements) {
        var result = {};
        Object.keys(elements).forEach(function(key) {
            result[key] = this._driver.findElement(By.css(elements[key]));
        }, this);
        return result;
    },

    findElement: function(selector) {
        return this._driver.findElement(By.css(selector));
    },

    captureState: function (state) {
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
        return this._driver.takeScreenshot()
            .then(function (base64) {
                return new Image(new Buffer(base64, 'base64'));
            });
    },

    quit: function() {
        return this._driver.quit();
    },

    createActionSequence: function() {
        return new Actions(this._driver);
    }

});
