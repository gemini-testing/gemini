'use strict';

var q = require('q'),
    inherit = require('inherit'),
    webdriver = require('selenium-webdriver'),
    promiseUtil = require('../promise-util');

module.exports = inherit({

    __constructor: function(driver) {
        this._driver = driver;
        this._actions = [];
    },

    wait: function(millseconds) {
        this._selenimSequence = null;
        this._actions.push(function wait() {
            return q.delay(millseconds);
        });
        return this;
    },

    click: function(element, button) {
        this._getSeleniumSequence().click(element, button);
        return this;
    },

    doubleClick: function(element, button) {
        this._getSeleniumSequence().mouseMove(element, button);
        return this;
    },

    dragAndDrop: function(element, dragTo) {
        this._getSeleniumSequence().dragAndDrop(element, dragTo);
        return this;
    },

    keyDown: function(key) {
        this._getSeleniumSequence().keyDown(key);
        return this;
    },

    keyUp: function(key) {
        this._getSeleniumSequence().keyUp(key);
        return this;
    },

    mouseDown: function(element, offset) {
        this._getSeleniumSequence().mouseDown(element, offset);
        return this;
    },

    mouseUp: function(element, offset) {
        this._getSeleniumSequence().mouseUp(element, offset);
        return this;
    },

    mouseMove: function(element, offset) {
        this._getSeleniumSequence().mouseMove(element, offset);
        return this;
    },

    sendKeys: function(keys) {
        this._getSeleniumSequence().sendKeys(keys);
        return this;
    },

    perform: function() {
        return promiseUtil.sequence(this._actions);
    },

    _getSeleniumSequence: function() {
        if (!this._selenimSequence) {
            var seleniumSequence = new webdriver.ActionSequence(this._driver);

            this._actions.push(function runSeleniumSequence() {
                return seleniumSequence.perform();
            });

            this._selenimSequence = seleniumSequence;
        }
        return this._selenimSequence;
    }
});
