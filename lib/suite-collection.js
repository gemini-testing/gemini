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
    }
});

module.exports = SuiteCollection;
