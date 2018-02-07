'use strict';

const _ = require('lodash');
const State = require('../state');
const {find} = require('./find-func');
const ActionsBuilder = require('./actions-builder');
const SkipBuilder = require('./skip/skip-builder');
const OnlyBuilder = require('./skip/only-builder');

module.exports = class SuiteBuilder {
    constructor(suite) {
        this._suite = suite;
        this._injectSkip();
    }

    setCaptureElements(...selectors) {
        selectors = _.flatten(selectors);

        if (!selectors.every(_.isString)) {
            throw new TypeError('suite.captureElements accepts only strings or array of strings');
        }

        this._suite.captureSelectors = selectors;
        return this;
    }

    before(hook) {
        if (!_.isFunction(hook)) {
            throw new TypeError('before hook must be a function');
        }

        this._suite.beforeActions = _.clone(this._suite.beforeActions);
        hook.call(this._suite.context, ActionsBuilder.create(this._suite.beforeActions), find);

        return this;
    }

    after(hook) {
        if (!_.isFunction(hook)) {
            throw new TypeError('after hook must be a function');
        }

        const actions = [];
        hook.call(this._suite.context, ActionsBuilder.create(actions), find);
        this._suite.afterActions = actions.concat(this._suite.afterActions);

        return this;
    }

    setUrl(url) {
        if (!_.isString(url)) {
            throw new TypeError('URL must be string');
        }
        this._suite.url = url;
        return this;
    }

    setTolerance(tolerance) {
        if (!_.isNumber(tolerance)) {
            throw new TypeError('tolerance must be number');
        }
        this._suite.tolerance = tolerance;
        return this;
    }

    ignoreElements(...selectors) {
        selectors = _.flatten(selectors);

        if (selectors.some(isNotValidSelector)) {
            throw new TypeError('suite.ignoreElements accepts strings, object with property "every" as string or array of them');
        }

        this._suite.ignoreSelectors = selectors;
        return this;
    }

    _injectSkip() {
        const skipBuilder = SkipBuilder.create(this._suite);
        const onlyBuilder = OnlyBuilder.create(this._suite);

        _.extend(this, skipBuilder.buildAPI(this), onlyBuilder.buildAPI(this));
    }

    capture(name, opts, cb) {
        ({name, opts, cb} = this._rearrangeCaptureArgs(name, opts, cb));
        opts = _.assign({}, opts, {viewportOnly: false});
        return this._processCapture(name, opts, cb);
    }

    captureViewport(name, opts, cb) {
        ({name, opts, cb} = this._rearrangeCaptureArgs(name, opts, cb));
        opts = _.assign({}, opts, {viewportOnly: true});
        return this._processCapture(name, opts, cb);
    }

    _rearrangeCaptureArgs(name, opts, cb) {
        if (!cb) {
            cb = opts;
            opts = null;
        }

        cb = cb || _.noop;
        opts = opts || {};

        return {name, opts, cb};
    }

    _processCapture(name, opts, cb) {
        if (!_.isString(name)) {
            throw new TypeError('State name should be string');
        }

        if (!_.isFunction(cb)) {
            throw new TypeError('Second argument of suite.capture must be a function');
        }

        if (this._suite.hasStateNamed(name)) {
            throw new Error(`State "${name}" already exists in suite "${this._suite.name}". Choose different name`);
        }

        const state = new State(this._suite, name);
        cb.call(this._suite.context, ActionsBuilder.create(state.actions), find);

        if (_.has(opts, 'tolerance')) {
            if (!_.isNumber(opts.tolerance)) {
                throw new TypeError('Tolerance should be number');
            }
            state.tolerance = opts.tolerance;
        }
        state.viewportOnly = opts.viewportOnly;

        this._suite.addState(state);
        return this;
    }

};

// Check if selector is not a string or not an object with "every" option.
function isNotValidSelector(selector) {
    return !_.isString(selector) && !(_.isObject(selector) && _.isString(selector.every));
}
