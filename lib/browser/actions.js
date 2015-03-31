'use strict';

var q = require('q'),
    fs = require('q-io/fs'),
    inherit = require('inherit'),
    wd = require('wd'),
    promiseUtil = require('../promise-util'),
    suiteUtil = require('../suite-util'),
    StateError = require('../errors/state-error'),
    find = require('../find-func').find;

function isInvalidMouseButton(button) {
    if (typeof button !== 'undefined' && [0, 1, 2].indexOf(button) === -1) {
        throw new TypeError('Mouse button should be 0 (left), 1 (right) or 2 (middle)');
    }
}

function isInvalidKeys(keys) {
    if (typeof keys !== 'string') {
        if (!Array.isArray(keys)) {
            return true;
        }
        return keys.some(function(chunk) {
            return typeof chunk !== 'string';
        });
    }
    return false;
}

function isInvalidElement(element) {
    return (!element || !element._selector) && typeof element !== 'string';
}

function replaceStack(error, stack) {
    var message = error.stack.split('\n')[0];
    error.stack = [message].concat(stack.split('\n').slice(1)).join('\n');
}

function serializeFunc(func) {
    return '(' + func.toString()  + '(window));';
}

module.exports = inherit({

    __constructor: function(browser) {
        this._browser = browser;
        this._driver = browser._browser;
        this._actions = [];
    },

    wait: function(millseconds) {
        var _this = this;
        this._pushAction(this.wait, function wait() {
            return _this._driver.sleep(millseconds);
        });
        return this;
    },

    waitForElementToShow: function waitForElementToShow(selector, timeout) {
        this._waitElementAction(this.waitForElementToShow, selector, {
            timeout: timeout,
            asserter: wd.asserters.isDisplayed,
            error: 'was not shown'
        });

        return this;
    },

    waitForElementToHide: function waitForElementToHide(selector, timeout) {
        this._waitElementAction(this.waitForElementToHide, selector, {
            timeout: timeout,
            asserter: wd.asserters.isNotDisplayed,
            error: 'was not hidden'
        });

        return this;
    },

    _waitElementAction: function(method, selector, options) {
        if (typeof selector !== 'string') {
            throw new TypeError(method.name + ' accepts only CSS selectors');
        }

        var timeout = (typeof options.timeout !== 'undefined'? options.timeout : 1000);

        var _this = this;
        this._pushAction(method, function() {
            return _this._driver.waitForElementByCssSelector(selector, options.asserter, timeout)
                .fail(function() {
                    //assuming its timeout error, no way to distinguish
                    return q.reject(new StateError(
                        'Element ' + selector + ' ' + options.error + ' in ' + timeout + 'ms'));
                });
        });

        return this;
    },

    waitForJSCondition: function(jsFunc, timeout) {
        if (typeof jsFunc !== 'function') {
            throw new TypeError('waitForCondition should accept function');
        }
        timeout = (typeof timeout === 'undefined'? 1000 : timeout);

        var _this = this;
        this._pushAction(this.waitForJSCondition, function() {
            return _this._driver.waitFor(wd.asserters.jsCondition(serializeFunc(jsFunc)), timeout)
                .fail(function() {
                    return q.reject(new StateError('Condition was not met in ' + timeout + 'ms'));
                });
        });
        return this;
    },

    _pushAction: function(method, action) {
        var stackHolder = {};

        // capture stack trace to use it later in case
        // of an error.
        Error.captureStackTrace(stackHolder, method);

        this._actions.push(function() {
            return action()
                .fail(function(e) {
                    if (e instanceof StateError) {
                        // replace stack of the error, so that
                        // stactrace will now link to user's
                        // test code wil call to the action instead
                        // of gemini's internals.
                        replaceStack(e, stackHolder.stack);
                    }
                    return q.reject(e);
                });
        });
    },

    click: function(element, button) {
        if (isInvalidMouseButton(button)) {
            throw new TypeError('Mouse button should be 0 (left), 1 (right) or 2 (middle)');
        }

        if (isInvalidElement(element)) {
            throw new TypeError('.click() must receive valid element or CSS selector');
        }

        var _this = this;

        this._pushAction(this.click, function mouseDown() {
            return _this._findElement(element)
                .then(function(element) {
                    return _this._driver.moveTo(element);
                })
                .then(function() {
                    return _this._driver.click(button);
                });
        });
        return this;
    },

    doubleClick: function(element, button) {
        if (isInvalidMouseButton(button)) {
            throw new TypeError('Mouse button should be 0 (left), 1 (right) or 2 (middle)');
        }

        if (isInvalidElement(element)) {
            throw new TypeError('.doubleClick() must receive valid element or CSS selector');
        }

        var _this = this;
        this._pushAction(this.doubleClick, function() {
            return _this._findElement(element)
                .then(function() {
                    return _this._driver.moveTo(element);
                })
                .then(function() {
                    return _this._driver.doubleClick(element, button);
                });
        });
        return this;
    },

    dragAndDrop: function(element, dragTo) {
        if (isInvalidElement(element)) {
            throw new TypeError('.dragAndDrop() "element" argument should be valid element or CSS selector');
        }

        if (isInvalidElement(element)) {
            throw new TypeError('.dragAndDrop() "dragTo" argument should be valid element or CSS selector');
        }

        return this.mouseDown(element)
            .mouseMove(dragTo)
            .mouseUp();
    },

    mouseDown: function(element, button) {
        if (isInvalidMouseButton(button)) {
            throw new TypeError('Mouse button should be 0 (left), 1 (right) or 2 (middle)');
        }

        if (isInvalidElement(element)) {
            throw new TypeError('.mouseDown() must receive valid element or CSS selector');
        }

        var _this = this;
        this._pushAction(this.mouseDown, function mouseDown() {
            return _this._findElement(element)
                .then(function(element) {
                    return _this._driver.moveTo(element);
                })
                .then(function() {
                    return _this._driver.buttonDown(button);
                });
        });
        return this;
    },

    mouseUp: function(element, button) {
        if (isInvalidMouseButton(button)) {
            throw new TypeError('Mouse button should be 0 (left), 1 (right) or 2 (middle)');
        }

        if (isInvalidElement(element)) {
            throw new TypeError('.mouseUp() must receive valid element or CSS selector');
        }

        var _this = this;
        this._pushAction(this.mouseUp, function mouseDown() {
            return _this._findElement(element)
                .then(function(element) {
                    return _this._driver.moveTo(element);
                })
                .then(function() {
                    return _this._driver.buttonUp(button);
                });
        });
        return this;
    },

    mouseMove: function(element, offset) {
        if (isInvalidElement(element)) {
            throw new TypeError('.mouseMove() must receive valid element or CSS selector');
        }

        var _this = this;
        if (offset) {
            if ('x' in offset && typeof offset.x !== 'number') {
                throw new TypeError('offset.x should be a number');
            }

            if ('y' in offset && typeof offset.y !== 'number') {
                throw new TypeError('offset.y should be a number');
            }
        }

        this._pushAction(this.mouseMove, function mouseMove() {
            return _this._findElement(element).then(function(element) {
                if (offset) {
                    return _this._driver.moveTo(element, offset.x, offset.y);
                }
                return _this._driver.moveTo(element);
            });
        });

        return this;
    },

    sendKeys: function(element, keys) {
        var _this = this,
            action;
        if (typeof keys === 'undefined' || keys === null) {
            keys = element;
            action = function sendKeys() {
                return _this._driver.keys(keys);
            };
        } else {
            if (isInvalidElement(element)) {
                throw new TypeError('.sendKeys() must receive valid element or CSS selector');
            }

            action = function sendKeys() {
                return _this._findElement(element).then(function(element) {
                    return _this._driver.type(element, keys);
                });
            };
        }

        if (isInvalidKeys(keys)) {
            throw new TypeError('keys should be string or array of strings');
        }

        this._pushAction(this.sendKeys, action);

        return this;
    },

    sendFile: function(element, path) {
        var _this = this;
        if (typeof path !== 'string') {
            throw new TypeError('path must be string');
        }
        if (isInvalidElement(element)) {
            throw new TypeError('.sendFile() must receive valid element or CSS selector');
        }

        this._pushAction(this.sendFile, function sendFile() {
            return fs.isFile(path)
                .then(function(isFile) {
                    if (!isFile) {
                        return q.reject(new StateError(path + ' should be existing file'));
                    }
                    return _this._findElement(element);
                })
                .then(function(element) {
                    return element.sendKeys(path);
                });
        });
        return this;
    },

    focus: function(element) {
        if (isInvalidElement(element)) {
            throw new TypeError('.focus() must receive valid element or CSS selector');
        }

        return this.sendKeys(element, '');
    },

    tap: function(element) {
        if (isInvalidElement(element)) {
            throw new TypeError('.tap() must receive valid element or CSS selector');
        }

        var _this = this;

        this._pushAction(this.tap, function tap() {
            return _this._findElement(element)
                .then(function(elem) {
                    return _this._driver.tapElement(elem);
                });
        });
        return this;
    },

    flick: function(offsets, speed, element) {
        if (element && isInvalidElement(element)) {
            throw new TypeError('.flick() must receive valid element or CSS selector');
        }

        var _this = this;
        this._pushAction(this.flick, function flick() {
            if (element) {
                return _this._findElement(element)
                  .then(function(elem) {
                      return _this._driver.flick(elem, offsets.x, offsets.y, speed);
                  });
            }
            return _this._driver.flick(offsets.x, offsets.y, speed);
        });
        return this;
    },

    executeJS: function(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('executeJS argument should be function');
        }

        var _this = this;
        this._pushAction(this.executeJS, function executeJS() {
            return _this._driver.execute(serializeFunc(callback));
        });
        return this;
    },

    setWindowSize: function(width, height) {
        var _this = this;
        this._pushAction(this.setWindowSize, function setWindowSize() {
            return _this._driver.setWindowSize(width, height);
        });
        return this;
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
                    enumerable: false
                });

                return foundElement;
            })
            .fail(function(error) {
                if (error.status === 7) {
                    return q.reject(new StateError('Could not find element with css selector: ' + error.selector));
                }
                return q.reject(error);
            });
    },

    perform: function() {
        return promiseUtil.sequence(this._actions);
    },

    skip: function(browser) {
        var _this = this,
            last = this._actions.length - 1,
            action = this._actions[last],
            skip;

        if (last < 0) {
            throw new RangeError('There is no action defined to skip.');
        }

        if (!browser) {
            skip = true;
        } else if (!Array.isArray(browser)) {
            skip = [browser];
        } else {
            skip = browser;
        }

        this._actions[last] = function skipAction() {
            if (suiteUtil.shouldSkip(skip, _this._browser)) {
                return q.resolve();
            }

            return action.apply();
        };

        return this;
    }
});
