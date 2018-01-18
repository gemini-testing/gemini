'use strict';
const _ = require('lodash');
const State = require('../state');
const find = require('./find-func').find;
const ActionsBuilder = require('./actions-builder');

// Check if selector is not a string or not an object with "every" option.
const isNotValidSelector = (arg) => {
    return !(_.isString(arg) || (_.isObject(arg) && _.isString(arg.every)));
};

const flattenFirstArgument = (args) => {
    if (args.length === 1 && Array.isArray(args[0])) {
        return args[0];
    } else {
        return args;
    }
};

const isArrayOfStringsAndRegExps = (arr) => {
    return _.every(arr, function(item) {
        return _.isString(item) || _.isRegExp(item);
    });
};

const createMatcher = (matcher) => {
    return _.isRegExp(matcher) ? matcher.test.bind(matcher) : _.isEqual.bind(null, matcher);
};

module.exports = function(suite) {
    this.setCaptureElements = (...args) => {
        const selectors = flattenFirstArgument(args);

        if (selectors.some(_.negate(_.isString))) {
            throw new TypeError('suite.captureElements accepts only strings or array of strings');
        }

        suite.captureSelectors = selectors;
        return this;
    };

    this.before = (hook) => {
        if (typeof hook !== 'function') {
            throw new TypeError('before hook must be a function');
        }

        suite.beforeActions = _.clone(suite.beforeActions);
        hook.call(suite.context, ActionsBuilder.create(suite.beforeActions), find);

        return this;
    };

    this.after = (hook) => {
        if (typeof hook !== 'function') {
            throw new TypeError('after hook must be a function');
        }

        const actions = [];
        hook.call(suite.context, ActionsBuilder.create(actions), find);
        suite.afterActions = actions.concat(suite.afterActions);

        return this;
    };

    this.setUrl = (url) => {
        if (typeof url !== 'string') {
            throw new TypeError('URL must be string');
        }
        suite.url = url;
        return this;
    };

    this.setTolerance = (tolerance) => {
        if (typeof tolerance !== 'number') {
            throw new TypeError('tolerance must be number');
        }
        suite.tolerance = tolerance;
        return this;
    };

    this.capture = (name, opts, cb) => {
        if (typeof name !== 'string') {
            throw new TypeError('State name should be string');
        }

        if (!cb) {
            cb = opts;
            opts = null;
        }

        cb = cb || _.noop;
        opts = opts || {};

        if (typeof cb !== 'function') {
            throw new TypeError('Second argument of suite.capture must be a function');
        }

        if (suite.hasStateNamed(name)) {
            throw new Error('State "' + name + '" already exists in suite "' + suite.name + '". ' +
                'Choose different name');
        }

        const state = new State(suite, name);
        cb.call(suite.context, ActionsBuilder.create(state.actions), find);

        if ('tolerance' in opts) {
            if (typeof opts.tolerance !== 'number') {
                throw new TypeError('Tolerance should be number');
            }
            state.tolerance = opts.tolerance;
        }
        suite.addState(state);
        return this;
    };

    this.ignoreElements = (...args) => {
        const selectors = flattenFirstArgument(args);

        if (selectors.some(isNotValidSelector)) {
            throw new TypeError('suite.ignoreElements accepts strings, object with property "every" as string or array of them');
        }
        suite.ignoreSelectors = selectors;
        return this;
    };

    const saveSkipped = (browser, comment, opts = {}) => {
        if (!browser) {
            if (!opts.negate) {
                suite.skip();
            }
        } else if (_.isArray(browser)) {
            browser.forEach((b) => saveSkipped(b, comment, opts));
        } else if (_.isString(browser) || _.isRegExp(browser)) {
            const matches = opts.negate ? _.negate(createMatcher(browser)) : createMatcher(browser);
            suite.skip({matches, comment});
        } else {
            throw new TypeError('suite.skip browser must be string or RegExp object');
        }
        return this;
    };

    this.skip = (browser, comment) => saveSkipped(browser, comment);

    this.skip.in = this.skip;

    this.skip.notIn = (browser, comment) => saveSkipped(browser, comment, {negate: true});

    this.browsers = (matchers) => {
        matchers = [].concat(matchers);
        if (!isArrayOfStringsAndRegExps(matchers)) {
            throw new TypeError('suite.browsers must be string or RegExp object');
        }

        matchers = matchers.map(createMatcher);
        suite.browsers = suite.browsers.filter(function(browser) {
            return _.some(matchers, function(match) {
                return match(browser);
            });
        });
        return this;
    };
};
