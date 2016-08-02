'use strict';

const _ = require('lodash');
const inherit = require('inherit');
const format = require('util').format;
const SuiteBuilder = require('./tests-api/suite-builder');

module.exports = class SuiteCollection {
    constructor(suites) {
        this._suites = suites || [];
        this._originalBrowsers = {};
    }

    add(suite) {
        this._suites.push(suite);
        return this;
    }

    topLevelSuites() {
        return this._suites;
    }

    allSuites() {
        const flat_ = (suites) => {
            if (!suites) {
                return [];
            }

            return suites
                .map((suite) => [suite, flat_(suite.children)]);
        };

        return _.flattenDeep(flat_(this._suites));
    }

    skipBrowsers(browsers) {
        browsers.map((browser) => {
            this.topLevelSuites().forEach((suite) => {
                const suiteBuilder = new SuiteBuilder(suite);
                suiteBuilder.skip(browser, 'this browser was skipped by GEMINI_SKIP_BROWSERS environment variable');
            });
        });
    }

    disableAll() {
        return this._applyToTopLevel(this.disable);
    }

    enableAll() {
        return this._applyToTopLevel(this.enable);
    }

    _applyToTopLevel(method) {
        this.topLevelSuites().forEach((suite) => {
            method.call(this, suite);
        }, this);

        return this;
    }

    disable(suite, opts) {
        this._applyRecrusive(this._disableEntity, suite, opts);

        return this;
    }

    enable(suite, opts) {
        suite = this._applyRecrusive(this._enableEntity, suite, opts);
        while (suite) {
            this._enableEntity(suite, opts && opts.browser);
            suite = suite.parent;
        }

        return this;
    }

    _applyRecrusive(method, suite, opts) {
        opts = opts || {};

        if (_.isString(suite)) {
            suite = this._findSuite(suite);
        }

        if (opts.state) {
            method.call(this, this._findState(opts.state, suite), opts.browser);
        } else {
            suite.children.forEach((child) => {
                this._applyRecrusive(method, child, opts);
            }, this);

            suite.states.forEach(_.bind(method, this, _, opts.browser));
            method.call(this, suite, opts.browser);
        }

        return suite;
    }

    _findSuite(fullName) {
        const suite = _.find(this.allSuites(), {fullName: fullName});

        if (!suite) {
            throw new Error('Unknown suite: ' + fullName);
        }

        return suite;
    }

    _findState(name, suite) {
        const state = _.find(suite.states, {name: name});

        if (!state) {
            throw new Error(format('No such state `%s` in suite `%s`', name, suite.fullName));
        }

        return state;
    }

    _disableEntity(obj, browser) {
        this._originalBrowsers[obj.fullName] = obj.browsers;
        obj.browsers = browser ? _.without(obj.browsers, browser) : [];
    }

    _enableEntity(obj, browser) {
        if (!browser && this._originalBrowsers[obj.fullName]) {
            obj.browsers = _.union(obj.browsers, this._originalBrowsers[obj.fullName]);
        }

        if (browser) {
            obj.browsers = _.union(obj.browsers, [browser]);
        }
    }
};
