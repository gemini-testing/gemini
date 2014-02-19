'use strict';

var inherit = require('inherit'),
    webdriver = require('selenium-webdriver'),
    Image = require('./image'),
    By = webdriver.By;

module.exports = inherit({
    __constructor: function() {
        this._driver = new webdriver.Builder().
           withCapabilities(webdriver.Capabilities.chrome()).
           build();
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
        return new webdriver.ActionSequence(this._driver);
    }

});
