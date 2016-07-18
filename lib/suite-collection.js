'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
    format = require('util').format;

module.exports = inherit({
    __constructor: function(suites) {
        this._suites = suites || [];
        this._originalBrowsers = {};
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
        this._applyRecrusive(this._disableEntity, suite, opts);
        return this;
    },

    enable: function(suite, opts) {
        suite = this._applyRecrusive(this._enableEntity, suite, opts);
        while (suite) {
            this._enableEntity(suite, opts && opts.browser);
            suite = suite.parent;
        }
        return this;
    },

    _applyRecrusive: function(method, suite, opts) {
        opts = opts || {};

        if (_.isString(suite)) {
            suite = this._findSuite(suite);
        }

        if (opts.state) {
            method.call(this, this._findState(opts.state, suite), opts.browser);
        } else {
            suite.children.forEach(function(child) {
                this._applyRecrusive(method, child, opts);
            }, this);

            suite.states.forEach(_.bind(method, this, _, opts.browser));
            method.call(this, suite, opts.browser);
        }

        return suite;
    },

    _findSuite: function(fullName) {
        var suite = _.find(this.allSuites(), {fullName: fullName});
        if (!suite) {
            throw new Error('Unknown suite: ' + fullName);
        }
        return suite;
    },

    _findState: function(name, suite) {
        var state = _.find(suite.states, {name: name});
        if (!state) {
            throw new Error(format('No such state `%s` in suite `%s`', name, suite.fullName));
        }
        return state;
    },

    _disableEntity: function(obj, browser) {
        this._originalBrowsers[obj.fullName] = obj.browsers;
        obj.browsers = browser ? _.without(obj.browsers, browser) : [];
    },

    _enableEntity: function(obj, browser) {
        if (!browser && this._originalBrowsers[obj.fullName]) {
            obj.browsers = _.union(obj.browsers, this._originalBrowsers[obj.fullName]);
        }

        if (browser) {
            obj.browsers = _.union(obj.browsers, [browser]);
        }
    }
});
