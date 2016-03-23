'use strict';

var _ = require('lodash'),
    inherit = require('inherit');

var STATS = {
    PASSED: 'passed',
    FAILED: 'failed',
    SKIPPED: 'skipped'
};

module.exports = inherit({
    __constructor: function() {
        this._stats = {};
        this._ignoredSuites = [];
    },

    onPassed: function(passed) {
        this._addStat(STATS.PASSED, passed);
    },

    onFailed: function(failed) {
        this._addStat(STATS.FAILED, failed);
    },

    onSkipped: function(skipped) {
        this._addStat(STATS.SKIPPED, skipped);
    },

    onRetry: function(retried) {
        if (!this._mustCountCompleted(retried)) {
            return;
        }

        var suiteStats = this._getSuiteStats(retried);

        suiteStats.retries++;
        suiteStats.states = {};

        this._ignoredSuites.push(this._buildSuiteKey(retried));
    },

    onEndSession: function() {
        this._ignoredSuites = [];
        return this;
    },

    getResult: function() {
        var result = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            retries: 0
        };

        _.forEach(this._stats, function(suiteStats) {
            result.retries += suiteStats.retries;
            _.forEach(suiteStats.states, function(stateStatus) {
                result.total++;
                result[stateStatus]++;
            });
        });

        return result;
    },

    _addStat: function(stat, completed) {
        if (!completed.state || !this._mustCountCompleted(completed)) {
            return;
        }

        var suiteStats = this._getSuiteStats(completed);

        suiteStats.states[completed.state.name] = stat;
    },

    //done because in n-1 test session may add result for some states and in n test session fail suite by critical error
    _mustCountCompleted: function(completed) {
        return !_.includes(this._ignoredSuites, this._buildSuiteKey(completed));
    },

    _getSuiteStats: function(completed) {
        var key = this._buildSuiteKey(completed);

        if (!this._stats[key]) {
            this._stats[key] = {
                retries: 0,
                states: {}
            };
        }

        return this._stats[key];
    },

    _buildSuiteKey: function(completed) {
        return completed.suite.fullName + completed.browserId;
    }
});
