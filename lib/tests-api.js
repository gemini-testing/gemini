'use strict';
var Suite = require('./suite'),
    State = require('./state');

function nothing() {}

function makeSkipBrowser(browser) {
    if (typeof browser === 'string') {
        return {name: browser};
    }
    return browser;
}

function SuiteBuilder(suite) {

    this.setCaptureElements = function() {
        if (arguments.length === 1 && Array.isArray(arguments[0])) {
            suite.captureSelectors = arguments[0];
        } else {
            suite.captureSelectors = Array.prototype.slice.call(arguments);
        }
        return this;
    };

    this.before = function(hook) {
       suite.beforeHook = hook;
       return this;
    };

    this.setUrl = function setUrl(url) {
        suite.url = url;
        return this;
    };

    this.capture = function capture(name, cb) {
        cb = cb || nothing;
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
            throw new Error('Unacceptable value for .skip method: ' + browser);
        }
        return this;
    };
}

module.exports = function(context, rootSuite) {
    context.suite = function suite(name, callback) {
        if (typeof name !== 'string') {
            throw new Error('First argument of the .suite must be a string');
        }

        if (typeof callback !== 'function') {
            throw new Error('Second argument of the .suite must be a function');
        }

        rootSuite = Suite.create(name, rootSuite);
        callback(new SuiteBuilder(rootSuite));
        rootSuite = rootSuite.parent;
    };
};
