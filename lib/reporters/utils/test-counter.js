'use strict';

var _ = require('lodash'),
    inherit = require('inherit');

var STATS = {
    UPDATED: 'updated',
    PASSED: 'passed',
    FAILED: 'failed',
    SKIPPED: 'skipped'
};

module.exports = inherit({
    __constructor: function() {
        this._stats = {};
    },

    onUpdated: function(updated) {
        this._addStat(STATS.UPDATED, updated);
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
        var suiteStats = this._getSuiteStats(retried);

        suiteStats.retries++;
        suiteStats.states = {};
    },

    getResult: function() {
        var result = {
            total: 0,
            updated: 0,
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
        var completedEntity = completed.state || completed.suite;
        if (!completedEntity) {
            return;
        }

        var suiteStats = this._getSuiteStats(completed);

        suiteStats.states[completedEntity.name] = stat;
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
