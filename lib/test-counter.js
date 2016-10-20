'use strict';

const _ = require('lodash');

const STATS = {
    total: 'total',
    updated: 'updated',
    passed: 'passed',
    failed: 'failed',
    errored: 'errored',
    skipped: 'skipped',
    warned: 'warned',
    retries: 'retries'
};

module.exports = class TestCounter {
    constructor() {
        this._stats = {};
    }

    onUpdated(updated) {
        this._addStat(STATS.updated, updated);
    }

    onPassed(passed) {
        this._addStat(STATS.passed, passed);
    }

    onFailed(failed) {
        this._addStat(STATS.failed, failed);
    }

    onErrored(errored) {
        this._addStat(STATS.errored, errored);
    }

    onSkipped(skipped) {
        this._addStat(STATS.skipped, skipped);
    }

    onWarned(warned) {
        this._addStat(STATS.warned, warned);
    }

    onRetry(retried) {
        const suiteStats = this._getSuiteStats(retried);

        suiteStats.retries++;
    }

    _addStat(stat, test) {
        const suiteStats = this._getSuiteStats(test);

        suiteStats.states[test.state.name] = stat;
    }

    _getSuiteStats(test) {
        const key = this._buildSuiteKey(test);

        if (!this._stats[key]) {
            this._stats[key] = {
                retries: 0,
                states: {}
            };
        }

        return this._stats[key];
    }

    _buildSuiteKey(test) {
        return test.suite.fullName + test.browserId;
    }

    getResult() {
        const statNames = _.keys(STATS);
        const result = _.zipObject(statNames, _.fill(Array(statNames.length), 0));

        _.forEach(this._stats, (suiteStats) => {
            result.retries += suiteStats.retries;
            _.forEach(suiteStats.states, (stateStatus) => {
                result.total++;
                result[stateStatus]++;
            });
        });

        return result;
    }
};
