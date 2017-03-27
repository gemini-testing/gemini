'use strict';

const _ = require('lodash');
const SuiteBuilder = require('./tests-api/suite-builder');

module.exports = class SuiteCollection {
    constructor(suites) {
        this._suites = _.clone(suites) || [];
        this._originalBrowsers = {};
    }

    add(suite) {
        this._suites.push(suite);
        return this;
    }

    clone() {
        const clonedSuites = this._suites.map((suite) => suite.clone());
        return new SuiteCollection(clonedSuites);
    }

    topLevelSuites() {
        return this._suites;
    }

    allSuites() {
        const flat_ = (suites) => _.map(suites, (s) => [s, flat_(s.children)]);

        return _.flattenDeep(flat_(this._suites));
    }

    skipBrowsers(browsers) {
        this.topLevelSuites().forEach((suite) => {
            const suiteBuilder = new SuiteBuilder(suite);
            suiteBuilder.skip(browsers, 'The test was skipped by environment variable GEMINI_SKIP_BROWSERS');
        });
    }

    disableAll() {
        return this._applyToTopLevel(this.disable);
    }

    enableAll() {
        return this._applyToTopLevel(this.enable);
    }

    _applyToTopLevel(method) {
        this.topLevelSuites().forEach((suite) => method.call(this, suite));

        return this;
    }

    disable(suite, opts) {
        this._applyRecursive(this._disableEntity, suite, opts);

        return this;
    }

    enable(suite, opts) {
        suite = this._applyRecursive(this._enableEntity, suite, opts);
        while (suite) {
            this._enableEntity(suite, opts && opts.browser);
            suite = suite.parent;
        }

        return this;
    }

    _applyRecursive(method, suite, opts) {
        opts = opts || {};

        if (_.isString(suite)) {
            suite = this._findSuite(suite);
        }

        if (opts.state) {
            method.call(this, this._findState(opts.state, suite), opts.browser);
        } else {
            suite.children.forEach((child) => this._applyRecursive(method, child, opts));

            suite.states.forEach(_.bind(method, this, _, opts.browser));
            method.call(this, suite, opts.browser);
        }

        return suite;
    }

    _findSuite(fullName) {
        const suite = _.find(this.allSuites(), {fullName});

        if (!suite) {
            throw new Error('Unknown suite: ' + fullName);
        }

        return suite;
    }

    _findState(name, suite) {
        const state = _.find(suite.states, {name});

        if (!state) {
            throw new Error(`No such state ${name} in suite ${suite.fullName}`);
        }

        return state;
    }

    _disableEntity(obj, browser) {
        this._originalBrowsers[obj.fullName + obj.file] = obj.browsers;
        obj.browsers = browser ? _.without(obj.browsers, browser) : [];
    }

    _enableEntity(obj, browser) {
        const suiteKey = obj.fullName + obj.file;
        if (!browser && this._originalBrowsers[suiteKey]) {
            obj.browsers = _.union(obj.browsers, this._originalBrowsers[suiteKey]);
        }

        if (browser) {
            obj.browsers = _.union(obj.browsers, [browser]);
        }
    }
};
