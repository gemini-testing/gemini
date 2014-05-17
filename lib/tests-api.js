'use strict';
var Suite = require('./suite'),
    State = require('./state');

function nothing() {}

function makeSkipBrowser(browser) {
    if (typeof browser === 'string') {
        return {name: browser};
    }

    if (typeof browser !== 'object') {
        throw new TypeError('suite.skip browsers must be strings or object');
    }

    if (!browser.name) {
        throw new Error('Browser name is not specified');
    }

    if (typeof browser.name !== 'string') {
        throw new TypeError('Browser name must be a string');
    }

    if ('version' in browser && typeof browser.version !== 'string') {
        throw new TypeError('Browser version must be a string');
    }

    return browser;
}

function notString(arg) {
    return typeof arg !== 'string';
}

function SuiteBuilder(suite) {

    this.setCaptureElements = function() {
        var selectors;
        if (arguments.length === 1 && Array.isArray(arguments[0])) {
            selectors = arguments[0];
        } else {
            selectors = Array.prototype.slice.call(arguments);
        }

        if (selectors.some(notString)) {
            throw new TypeError('suite.captureElements accepts only strings or array of strings');
        }

        suite.captureSelectors = selectors;
        return this;
    };

    this.before = function(hook) {
        if (typeof hook !== 'function') {
            throw new TypeError('before hook must be a function');
        }
        suite.beforeHook = hook;
        return this;
    };

    this.setUrl = function setUrl(url) {
        if (typeof url !== 'string') {
            throw new TypeError('URL must be string');
        }
        suite.url = url;
        return this;
    };

    this.capture = function capture(name, cb) {
        if (typeof name !== 'string') {
            throw new TypeError('State name should be string');
        }
        cb = cb || nothing;

        if (typeof cb !== 'function') {
            throw new TypeError('Second argument of suite.capture must be a function');
        }

        if (suite.hasStateNamed(name)) {
            throw new Error('State "' + name + '" already exists in suite "' + suite.name + '". ' + 
                'Choose different name');
        }
        suite.addState(new State(suite, name, cb));
        return this;
    };

    this.skip = function skip(browser) {
        if (!browser) {
            suite.skip();
        } else if (Array.isArray(browser)) {
            suite.skip(browser.map(makeSkipBrowser));
        } else if (typeof browser === 'string' || typeof browser === 'object') {
            suite.skip([makeSkipBrowser(browser)]);
        } else {
            throw new TypeError('Unacceptable value for suite.skip method: ' + browser);
        }
        return this;
    };
}

module.exports = function(context, rootSuite) {
    context.suite = function suite(name, callback) {
        if (typeof name !== 'string') {
            throw new TypeError('First argument of the gemini.suite must be a string');
        }

        if (typeof callback !== 'function') {
            throw new TypeError('Second argument of the gemini.suite must be a function');
        }

        if (rootSuite.hasChildNamed(name)) {
            throw new Error('Suite ' + name + ' already exists at this level. Choose different name');
        }

        rootSuite = Suite.create(name, rootSuite);
        callback(new SuiteBuilder(rootSuite));
        rootSuite = rootSuite.parent;
    };
};
