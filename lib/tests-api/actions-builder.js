'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const wd = require('wd');

const StateError = require('../errors/state-error');
const find = require('./find-func').find;

module.exports = class ActionsBuilder {
    static create(actions) {
        return new ActionsBuilder(actions);
    }

    constructor(actions) {
        this._actions = actions;
    }

    wait(milliseconds) {
        this._pushAction(this.wait, (browser) => {
            return browser.sleep(milliseconds);
        });
        return this;
    }

    waitForElementToShow(selector, timeout) {
        this._waitElementAction(this.waitForElementToShow, selector, {
            timeout: timeout,
            asserter: wd.asserters.isDisplayed,
            error: 'was not shown'
        });

        return this;
    }

    waitForElementToHide(selector, timeout) {
        this._waitElementAction(this.waitForElementToHide, selector, {
            timeout: timeout,
            asserter: wd.asserters.isNotDisplayed,
            error: 'was not hidden'
        });

        return this;
    }

    _waitElementAction(method, selector, options) {
        options = _.defaults(options, {timeout: 1000});

        if (typeof selector !== 'string') {
            throw new TypeError(method.name + ' accepts only CSS selectors');
        }

        if (typeof options.timeout !== 'number') {
            throw new TypeError(method.name + ' accepts only numeric timeout');
        }

        this._pushAction(method, (browser) => {
            return browser.waitForElementByCssSelector(selector, options.asserter, options.timeout)
                .catch(() => {
                    //assuming its timeout error, no way to distinguish
                    return Promise.reject(new StateError(
                        'Element ' + selector + ' ' + options.error + ' in ' + options.timeout + 'ms'));
                });
        });

        return this;
    }

    waitForJSCondition(jsFunc, timeout) {
        if (typeof jsFunc !== 'function') {
            throw new TypeError('waitForCondition should accept function');
        }
        timeout = (typeof timeout === 'undefined' ? 1000 : timeout);

        this._pushAction(this.waitForJSCondition, (browser) => {
            return browser.waitFor(wd.asserters.jsCondition(serializeFunc(jsFunc)), timeout)
                .catch(() => Promise.reject(new StateError('Condition was not met in ' + timeout + 'ms')));
        });
        return this;
    }

    _pushAction(method, action) {
        let stackHolder = {};

        // capture stack trace to use it later in case
        // of an error.
        Error.captureStackTrace(stackHolder, method);

        this._actions.push(function() {
            return action.apply(null, arguments)
                .catch((e) => {
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
    }

    click(element, button) {
        button = acceptMouseButton(button);

        if (isInvalidElement(element)) {
            throw new TypeError('.click() must receive valid element or CSS selector');
        }

        this._pushAction(this.click, (browser) => {
            return findElement(element, browser)
                .then((element) => browser.moveTo(element))
                .then(() => browser.click(button));
        });
        return this;
    }

    doubleClick(element) {
        if (isInvalidElement(element)) {
            throw new TypeError('.doubleClick() must receive valid element or CSS selector');
        }

        this._pushAction(this.doubleClick, (browser) => {
            return findElement(element, browser)
                .then((element) => {
                    return browser.moveTo(element)
                      .then(() => browser.doubleclick());
                });
        });
        return this;
    }

    dragAndDrop(element, dragTo) {
        if (isInvalidElement(element)) {
            throw new TypeError('.dragAndDrop() "element" argument should be valid element or CSS selector');
        }

        if (isInvalidElement(dragTo)) {
            throw new TypeError('.dragAndDrop() "dragTo" argument should be valid element or CSS selector');
        }

        return this.mouseDown(element)
            .mouseMove(dragTo)
            .mouseUp();
    }

    mouseDown(element, button) {
        button = acceptMouseButton(button);

        if (isInvalidElement(element)) {
            throw new TypeError('.mouseDown() must receive valid element or CSS selector');
        }

        this._pushAction(this.mouseDown, (browser) => {
            return findElement(element, browser)
                .then((element) => browser.moveTo(element))
                .then(() => browser.buttonDown(button));
        });
        return this;
    }

    mouseUp(element, button) {
        button = acceptMouseButton(button);

        this._pushAction(this.mouseUp, (browser) => {
            let action;
            if (element) {
                action = findElement(element, browser)
                    .then((element) => browser.moveTo(element));
            } else {
                action = Promise.resolve();
            }
            return action.then(() => browser.buttonUp(button));
        });
        return this;
    }

    mouseMove(element, offset) {
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

        this._pushAction(this.mouseMove, (browser) => {
            return findElement(element, browser)
                .then((element) => {
                    if (offset) {
                        return browser.moveTo(element, offset.x, offset.y);
                    }
                    return browser.moveTo(element);
                });
        });

        return this;
    }

    sendKeys(element, keys) {
        let action;

        if (typeof keys === 'undefined' || keys === null) {
            keys = element;
            action = (browser) => browser.keys(keys);
        } else {
            if (isInvalidElement(element)) {
                throw new TypeError('.sendKeys() must receive valid element or CSS selector');
            }

            action = (browser) => {
                return findElement(element, browser)
                    .then((element) => browser.type(element, keys));
            };
        }

        if (isInvalidKeys(keys)) {
            throw new TypeError('keys should be string or array of strings');
        }

        this._pushAction(this.sendKeys, action);

        return this;
    }

    sendFile(element, path) {
        if (typeof path !== 'string') {
            throw new TypeError('path must be string');
        }
        if (isInvalidElement(element)) {
            throw new TypeError('.sendFile() must receive valid element or CSS selector');
        }

        this._pushAction(this.sendFile, (browser) => {
            return fs.statAsync(path)
                .then((stat) => {
                    if (!stat.isFile()) {
                        return Promise.reject(new StateError(path + ' should be existing file'));
                    }
                    return findElement(element, browser);
                })
                .then((element) => element.sendKeys(path));
        });
        return this;
    }

    focus(element) {
        if (isInvalidElement(element)) {
            throw new TypeError('.focus() must receive valid element or CSS selector');
        }

        return this.sendKeys(element, '');
    }

    tap(element) {
        if (isInvalidElement(element)) {
            throw new TypeError('.tap() must receive valid element or CSS selector');
        }

        this._pushAction(this.tap, (browser) => {
            return findElement(element, browser)
                .then((elem) => browser.tapElement(elem));
        });
        return this;
    }

    flick(offsets, speed, element) {
        if (element && isInvalidElement(element)) {
            throw new TypeError('.flick() must receive valid element or CSS selector');
        }

        this._pushAction(this.flick, (browser) => {
            if (element) {
                return findElement(element, browser)
                  .then((elem) => browser.flick(elem, offsets.x, offsets.y, speed));
            }
            return browser.flick(offsets.x, offsets.y, speed);
        });
        return this;
    }

    executeJS(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('executeJS argument should be function');
        }

        this._pushAction(this.executeJS, (browser) => browser.execute(serializeFunc(callback)));
        return this;
    }

    setWindowSize(width, height) {
        this._pushAction(this.setWindowSize, (browser, postActions) => {
            return (postActions ? mkRestoreAction_() : Promise.resolve())
                .then(() => browser.setWindowSize(width, height));

            function mkRestoreAction_() {
                return browser.getWindowSize()
                    .then((size) => {
                        if (size.width !== width || size.height !== height) {
                            postActions.setWindowSize(size.width, size.height);
                        }
                    });
            }
        });

        return this;
    }

    changeOrientation(options = {}) {
        options = _.defaults(options, {timeout: 2500});

        this._pushAction(this.changeOrientation, (browser, postActions) => {
            if (postActions) {
                postActions.changeOrientation(options);
            }

            return getBodyWidth()
                .then((initialBodyWidth) => {
                    return rotate()
                        .then((result) => waitForOrientationChange(initialBodyWidth).then(() => result));
                });

            function getBodyWidth() {
                return browser.evalScript(serializeFunc(function(window) {
                    return window.document.body.clientWidth;
                }));
            }

            function rotate() {
                const orientations = ['PORTRAIT', 'LANDSCAPE'];
                const getAnotherOrientation = (orientation) => _(orientations).without(orientation).first();

                return browser.getOrientation()
                    .then((initialOrientation) => browser.setOrientation(getAnotherOrientation(initialOrientation)));
            }

            function waitForOrientationChange(initialBodyWidth) {
                return browser
                    .waitFor(wd.asserters.jsCondition(serializeFunc(function(window, initialBodyWidth) {
                        return window.document.body.clientWidth !== Number(initialBodyWidth);
                    }, [initialBodyWidth])), options.timeout)
                    .catch(() => Promise.reject(new StateError(`Orientation did not changed in ${options.timeout} ms`)));
            }
        });

        return this;
    }
};

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
        return keys.some((chunk) => typeof chunk !== 'string');
    }
    return false;
}

function isInvalidElement(element) {
    return (!element || !element._selector) && typeof element !== 'string';
}

function replaceStack(error, stack) {
    let message = error.stack.split('\n')[0];
    error.stack = [message].concat(stack.split('\n').slice(1)).join('\n');
}

function serializeFunc(func, args) {
    return '(' + func.toString() + (_.isEmpty(args) ? ')(window);' : `)(window, '${args.join('\', \'')}');`);
}

function findElement(element, browser) {
    if (element.cache && element.cache[browser.sessionId]) {
        return Promise.resolve(element.cache[browser.sessionId]);
    }

    if (typeof element === 'string') {
        element = find(element);
    }

    return browser.findElement(element._selector)
        .then((foundElement) => {
            element.cache = element.cache || {};
            element.cache[browser.sessionId] = foundElement;

            return foundElement;
        })
        .catch((error) => {
            if (error.status === 7) {
                error = new StateError('Could not find element with css selector in actions chain: '
                    + error.selector);
            }

            return Promise.reject(error);
        });
}
