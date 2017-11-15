'use strict';

const inherit = require('inherit');
const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const wd = require('wd');

const StateError = require('../errors/state-error');
const find = require('./find-func').find;

module.exports = inherit({
    __constructor: function(actions) {
        this._actions = actions;
    },

    wait: function(milliseconds) {
        this._pushAction(this.wait, function wait(browser) {
            return browser.sleep(milliseconds);
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

        var timeout = (typeof options.timeout !== 'undefined' ? options.timeout : 1000);

        this._pushAction(method, function(browser) {
            return browser.waitForElementByCssSelector(selector, options.asserter, timeout)
                .catch(function() {
                    //assuming its timeout error, no way to distinguish
                    return Promise.reject(new StateError(
                        'Element ' + selector + ' ' + options.error + ' in ' + timeout + 'ms'));
                });
        });

        return this;
    },

    waitForJSCondition: function(jsFunc, timeout) {
        if (typeof jsFunc !== 'function') {
            throw new TypeError('waitForCondition should accept function');
        }
        timeout = (typeof timeout === 'undefined' ? 1000 : timeout);

        this._pushAction(this.waitForJSCondition, function(browser) {
            return browser.waitFor(wd.asserters.jsCondition(serializeFunc(jsFunc)), timeout)
                .catch(function() {
                    return Promise.reject(new StateError('Condition was not met in ' + timeout + 'ms'));
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
            return action.apply(null, arguments)
                .catch(function(e) {
                    if (e instanceof StateError) {
                        // replace stack of the error, so that
                        // stacktrace will now link to user's
                        // test code wil call to the action instead
                        // of gemini's internals.
                        replaceStack(e, stackHolder.stack);
                    }
                    return Promise.reject(e);
                });
        });
    },

    click: function(element, button) {
        button = acceptMouseButton(button);

        if (isInvalidElement(element)) {
            throw new TypeError('.click() must receive valid element or CSS selector');
        }

        this._pushAction(this.click, function mouseDown(browser) {
            return findElement(element, browser)
                .then(function(element) {
                    return browser.moveTo(element);
                })
                .then(function() {
                    return browser.click(button);
                });
        });
        return this;
    },

    doubleClick: function(element) {
        if (isInvalidElement(element)) {
            throw new TypeError('.doubleClick() must receive valid element or CSS selector');
        }

        this._pushAction(this.doubleClick, function(browser) {
            return findElement(element, browser)
                .then(function(element) {
                    return browser.moveTo(element)
                      .then(function() {
                          return browser.doubleclick();
                      });
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
        button = acceptMouseButton(button);

        if (isInvalidElement(element)) {
            throw new TypeError('.mouseDown() must receive valid element or CSS selector');
        }

        this._pushAction(this.mouseDown, function mouseDown(browser) {
            return findElement(element, browser)
                .then(function(element) {
                    return browser.moveTo(element);
                })
                .then(function() {
                    return browser.buttonDown(button);
                });
        });
        return this;
    },

    mouseUp: function(element, button) {
        button = acceptMouseButton(button);

        this._pushAction(this.mouseUp, function mouseUp(browser) {
            var action;
            if (element) {
                action = findElement(element, browser)
                    .then(function(element) {
                        return browser.moveTo(element);
                    });
            } else {
                action = Promise.resolve();
            }
            return action.then(function() {
                return browser.buttonUp(button);
            });
        });
        return this;
    },

    mouseMove: function(element, offset) {
        if (isInvalidElement(element)) {
            throw new TypeError('.mouseMove() must receive valid element or CSS selector');
        }

        if (offset) {
            if ('x' in offset && typeof offset.x !== 'number') {
                throw new TypeError('offset.x should be a number');
            }

            if ('y' in offset && typeof offset.y !== 'number') {
                throw new TypeError('offset.y should be a number');
            }
        }

        this._pushAction(this.mouseMove, function mouseMove(browser) {
            return findElement(element, browser)
                .then(function(element) {
                    if (offset) {
                        return browser.moveTo(element, offset.x, offset.y);
                    }
                    return browser.moveTo(element);
                });
        });

        return this;
    },

    sendKeys: function(element, keys) {
        var action;

        if (typeof keys === 'undefined' || keys === null) {
            keys = element;
            action = function sendKeys(browser) {
                return browser.keys(keys);
            };
        } else {
            if (isInvalidElement(element)) {
                throw new TypeError('.sendKeys() must receive valid element or CSS selector');
            }

            action = function sendKeys(browser) {
                return findElement(element, browser)
                    .then(function(element) {
                        return browser.type(element, keys);
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
        if (typeof path !== 'string') {
            throw new TypeError('path must be string');
        }
        if (isInvalidElement(element)) {
            throw new TypeError('.sendFile() must receive valid element or CSS selector');
        }

        this._pushAction(this.sendFile, function sendFile(browser) {
            return fs.statAsync(path)
                .then(function(stat) {
                    if (!stat.isFile()) {
                        return Promise.reject(new StateError(path + ' should be existing file'));
                    }
                    return findElement(element, browser);
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

        this._pushAction(this.tap, function tap(browser) {
            return findElement(element, browser)
                .then(function(elem) {
                    return browser.tapElement(elem);
                });
        });
        return this;
    },

    flick: function(offsets, speed, element) {
        if (element && isInvalidElement(element)) {
            throw new TypeError('.flick() must receive valid element or CSS selector');
        }

        this._pushAction(this.flick, function flick(browser) {
            if (element) {
                return findElement(element, browser)
                  .then(function(elem) {
                      return browser.flick(elem, offsets.x, offsets.y, speed);
                  });
            }
            return browser.flick(offsets.x, offsets.y, speed);
        });
        return this;
    },

    executeJS: function(callback, args) {
        if (typeof callback !== 'function') {
            throw new TypeError('executeJS argument should be function');
        }

        this._pushAction(this.executeJS, function executeJS(browser) {
            return browser.execute(serializeFunc(callback), args);
        });
        return this;
    },

    setWindowSize: function(width, height) {
        this._pushAction(this.setWindowSize, function setWindowSize(browser, postActions) {
            return (postActions ? mkRestoreAction_() : Promise.resolve())
                .then(function() {
                    return browser.setWindowSize(width, height);
                });

            function mkRestoreAction_() {
                return browser.getWindowSize()
                    .then(function(size) {
                        if (size.width !== width || size.height !== height) {
                            postActions.setWindowSize(size.width, size.height);
                        }
                    });
            }
        });

        return this;
    },

    changeOrientation: function() {
        if (arguments.length) {
            throw new TypeError('.changeOrientation() does not accept any arguments');
        }

        const orientations = ['PORTRAIT', 'LANDSCAPE'];
        const getAnotherOrientation = (orientation) => _(orientations).without(orientation).first();

        this._pushAction(this.changeOrientation, (browser, postActions) => {
            if (postActions) {
                postActions.changeOrientation();
            }

            return browser.getOrientation()
                .then((initialOrientation) => browser.setOrientation(getAnotherOrientation(initialOrientation)));
        });

        return this;
    }
});

function acceptMouseButton(button) {
    if (typeof button === 'undefined') {
        return 0;
    }

    if ([0, 1, 2].indexOf(button) === -1) {
        throw new TypeError('Mouse button should be 0 (left), 1 (middle) or 2 (right)');
    }

    return button;
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
    return '(' + func.toString() + ').apply(null, [window].concat(Array.prototype.slice.call(arguments)));';
}

function findElement(element, browser) {
    if (element.cache && element.cache[browser.sessionId]) {
        return Promise.resolve(element.cache[browser.sessionId]);
    }

    if (typeof element === 'string') {
        element = find(element);
    }

    return browser.findElement(element._selector)
        .then(function(foundElement) {
            element.cache = element.cache || {};
            element.cache[browser.sessionId] = foundElement;

            return foundElement;
        })
        .catch(function(error) {
            if (error.status === 7) {
                error = new StateError('Could not find element with css selector in actions chain: '
                    + error.selector);
            }

            return Promise.reject(error);
        });
}
