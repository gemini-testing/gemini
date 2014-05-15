'use strict';

var util = require('util'),
    q = require('q'),
    inherit = require('inherit'),
    promiseUtil = require('../promise-util'),
    find = require('../find-func').find;

module.exports = inherit({

    __constructor: function(browser) {
        this._browser = browser;
        this._driver = browser._browser;
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
            return _this._findElement(element)
                .then(function(element) {
                    return _this._driver.moveTo(element._wdElement);
                }) 
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
            return _this._findElement(element)
                .then(function() {
                    return _this._driver.moveTo(element);
                })
                .then(function() {
                    return _this._driver.doubleClick(element._wdElement, button);
                });
        });
        return this;
    },

    dragAndDrop: function(element, dragTo) {
        this._validateElement('drag', element);
        this._validateElement('drop', dragTo);
        return this.mouseDown(element)
            .mouseMove(dragTo)
            .mouseUp();
    },

    mouseDown: function(element, button) {
        var _this = this;
        this._validateElement('mouseDown', element);
        this._actions.push(function mouseDown() {
            return _this._findElement(element)
                .then(function(element) {
                    return _this._driver.moveTo(element._wdElement);
                })
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
            return _this._findElement(element)
                .then(function(element) {
                    return _this._driver.moveTo(element._wdElement);
                })
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
            return _this._findElement(element).then(function(element) {
                return _this._driver.moveTo(element._wdElement);
            });
        });
        return this;
    },

    sendKeys: function(element, keys) {
        var _this = this;
        if (!keys) {
            keys = element;
            this._actions.push(function sendKeys() {
                return _this._driver.keys(keys);
            });
        } else {
            this._validateElement('sendKeys', element);
            this._actions.push(function sendKeys() {
                return _this._findElement(element).then(function(element) {
                    return _this._driver.type(element._wdElement, keys);
                });
            });
        }

        return this;
    },

    executeJS: function(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('executeJS argument should be function');
        }

        var _this = this,
            code = '(' + callback.toString()  + '(window));';
        this._actions.push(function executeJS() {
            return _this._driver.execute(code);
        });
        return this;
    },

    _validateElement: function(action, element) {
        if ((!element || !element._selector) && typeof element !== 'string') {
            throw new TypeError(
                util.format(
                    '%s action should receive an element instance or selector as an argument',
                    action
                )
            );
        }
    },

    _findElement: function(element) {
        if (element._element) {
            return q.resolve(element._element);
        }

        if (typeof element === 'string') {
            element = find(element);
        }

        return this._browser.findElement(element._selector)
            .then(function(foundElement) {
                Object.defineProperty(element, '_element', {
                    value: foundElement,
                    writable: false,
                    enumerable: false,
                });

                return foundElement;
            });
    },

    perform: function() {
        return promiseUtil.sequence(this._actions);
    }
});
