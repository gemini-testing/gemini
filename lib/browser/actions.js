'use strict';

var util = require('util'),
    inherit = require('inherit'),
    promiseUtil = require('../promise-util');

module.exports = inherit({

    __constructor: function(driver) {
        this._driver = driver;
        this._actions = [];
    },

    wait: function(millseconds) {
        var _this = this;
        this._actions.push(function wait() {
            return _this._driver.sleep(millseconds);
        });
        return this;
    },

    click: function(element, button) {
        var _this = this;
        this._validateElement('click', element);
        this._actions.push(function mouseDown() {
            return _this._driver.moveTo(element._wdElement)
                .then(function() {
                    return _this._driver.click(button);
                });
        });
        return this;
    },

    doubleClick: function(element, button) {
        var _this = this;
        this._validateElement('doubleClick', element);
        this._actions.push(function() {
            return _this._driver.moveTo(element)
                .then(function() {
                    return _this._driver.doubleClick(element._wdElement, button);
                });
        });
        return this;
    },

    dragAndDrop: function(element, dragTo) {
        this._validateElement('drag', element);
        this._validateElement('drop', dragTo);
        return this.mouseDown(element._wdElement)
            .mouseMove(dragTo._wdElement)
            .mouseUp();
    },

    mouseDown: function(element, button) {
        var _this = this;
        this._validateElement('mouseDown', element);
        this._actions.push(function mouseDown() {
            return _this._driver.moveTo(element._wdElement)
                .then(function() {
                    return _this._driver.buttonDown(button);
                });
        });
        return this;
    },

    mouseUp: function(element, button) {
        var _this = this;
        this._validateElement('mouseUp', element);
        this._actions.push(function mouseDown() {
            return _this._driver.moveTo(element._wdElement)
                .then(function() {
                    return _this._driver.buttonUp(button);
                });
        });
        return this;
    },

    mouseMove: function(element, offset) {
        var _this = this;
        this._validateElement('mouseMove', element);
        this._actions.push(function mouseMove() {
            return _this._driver.moveTo(element._wdElement);
        });
        return this;
    },

    sendKeys: function(keys) {
        var _this = this;
        this._actions.push(function sendKeys() {
            return _this._driver.keys(keys);
        });
        return this;
    },

    _validateElement: function(action, element) {
        if (element.dynamicStub) {
            throw new Error(
                util.format(
                    'Trying to perform %s on dynamic element "%s" that not yet exists or already removed',
                    action,
                    element.name
                )
            );
        }
    },

    perform: function() {
        return promiseUtil.sequence(this._actions);
    }
});
