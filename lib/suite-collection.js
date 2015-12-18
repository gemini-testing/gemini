'use strict';

var _ = require('lodash'),
    inherit = require('inherit');

var SuiteCollection = inherit({
    __constructor: function(suites) {
        this._suites = suites || [];
    },

    add: function(suite) {
        this._suites.push(suite);
        return this;
    },

    topLevelSuites: function() {
        return this._suites;
    },

    allSuites: function() {
        return _.flattenDeep(flat_(this._suites));

        function flat_(suites) {
            if (!suites) {
                return [];
            }

            return suites
                .map(function(suite) {
                    return [suite, flat_(suite.children)];
                });
        }
    },

    disableAll: function() {
        return this._applyToTopLevel(this.disable);
    },

    enableAll: function() {
        return this._applyToTopLevel(this.enable);
    },

    _applyToTopLevel: function(method) {
        this.topLevelSuites().forEach(function(suite) {
            method.call(this, suite);
        }, this);

        return this;
    },

    disable: function(suite, opts) {
        var rules = getRules(suite, opts);

        suite.isDisabled = function(browser, state) {
            return rules.new(browser, state)
                || rules.prev(browser, state);
        };

        return this._resetTree(suite);
    },

    enable: function(suite, opts) {
        var rules = getRules(suite, opts);

        suite.isDisabled = function(browser, state) {
            return !rules.new(browser, state)
                && rules.prev(browser, state);
        };

        return this._resetTree(suite);
    },

    _resetTree: function(suite) {
        suite.children.forEach(function(child) {
            delete child.isDisabled;
            this._resetTree(child);
        }, this);

        return this;
    }
});

function getRules(suite, opts) {
    opts = opts || {};
    return {
        prev: suite.isDisabled || returnFalse_,
        new: mkDisableRule(opts.browser, opts.state)
    };

    function returnFalse_() {
        return false;
    }
}

function mkDisableRule(browserId, stateName) {
    return function isDisabled(browserToCheck, stateToCheck) {
        return !stateName && !browserId
            ||  stateName && !browserId && checkState_()
            || !stateName &&  browserId && checkBrowser_()
            ||  stateName &&  browserId && checkState_() && checkBrowser_();

        function checkState_() {
            return stateToCheck && stateName === stateToCheck.name;
        }

        function checkBrowser_() {
            return browserToCheck && browserId === browserToCheck;
        }
    };
}

module.exports = SuiteCollection;
