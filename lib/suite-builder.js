'use strict';
var _ = require('lodash'),
    State = require('./state');

function nothing() {}

function makeSkipBrowser(browser) {
    if (typeof browser === 'string') {
        return {browserName: browser};
    }

    if (typeof browser !== 'object' || browser === null) {
        throw new TypeError('suite.skip browsers must be strings or object');
    }

    if (!browser.browserName) {
        throw new Error('browserName is not specified');
    }

    if (typeof browser.browserName !== 'string') {
        throw new TypeError('browserName must be a string');
    }

    if ('version' in browser && typeof browser.version !== 'string') {
        throw new TypeError('version must be a string');
    }

    return browser;
}

function notString(arg) {
    return typeof arg !== 'string';
}

function argumentsToArray(args) {
    if (args.length === 1 && Array.isArray(args[0])) {
        return args[0];
    } else {
        return Array.prototype.slice.call(args);
    }
}

function SuiteBuilder(suite) {
    this.suite = suite;
}

_.extend(SuiteBuilder.prototype, {

    setCaptureElements: function() {
        var selectors = argumentsToArray(arguments);

        if (selectors.some(notString)) {
            throw new TypeError('this.suite.captureElements accepts only strings or array of strings');
        }

        this.suite.captureSelectors = selectors;
        return this;
    },

    before: function(hook) {
        if (typeof hook !== 'function') {
            throw new TypeError('before hook must be a function');
        }
        this.suite.beforeHook = hook;
        return this;
    },

    after: function(hook) {
        if (typeof hook !== 'function') {
            throw new TypeError('after hook must be a function');
        }
        this.suite.afterHook = hook;
        return this;
    },

    setUrl: function setUrl(url) {
        if (typeof url !== 'string') {
            throw new TypeError('URL must be string');
        }
        this.suite.url = url;
        return this;
    },

    setTolerance: function setTolerance(tolerance) {
        if (typeof tolerance !== 'number') {
            throw new TypeError('tolerance must be number');
        }
        this.suite.tolerance = tolerance;
        return this;
    },

    capture: function capture(name, opts, cb) {
        if (typeof name !== 'string') {
            throw new TypeError('State name should be string');
        }

        if (!cb) {
            cb = opts;
            opts = null;
        }

        cb = cb || nothing;
        opts = opts || {};

        if (typeof cb !== 'function') {
            throw new TypeError('Second argument of this.suite.capture must be a function');
        }

        if (this.suite.hasStateNamed(name)) {
            throw new Error('State "' + name + '" already exists in suite "' + this.suite.name + '". ' +
                'Choose different name');
        }
        var state = new State(this.suite, name, cb);
        if ('tolerance' in opts) {
            if (typeof opts.tolerance !== 'number') {
                throw new TypeError('Tolerance should be number');
            }
            state.tolerance = opts.tolerance;
        }
        this.suite.addState(state);
        return this;
    },

    ignoreElements: function ignoreElements() {
        var selectors = argumentsToArray(arguments);

        if (selectors.some(notString)) {
            throw new TypeError('this.suite.ignoreElements accepts only strings or array of strings');
        }
        this.suite.ignoreSelectors = selectors;
        return this;
    },

    skip: function skip(browser) {
        if (!browser) {
            this.suite.skip();
        } else if (Array.isArray(browser)) {
            this.suite.skip(browser.map(makeSkipBrowser));
        } else if (typeof browser === 'string' || typeof browser === 'object') {
            this.suite.skip([makeSkipBrowser(browser)]);
        } else {
            throw new TypeError('Unacceptable value for this.suite.skip method: ' + browser);
        }
        return this;
    }
});

module.exports = SuiteBuilder;
