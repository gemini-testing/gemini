'use strict';

const _ = require('lodash');
const RunnerEvents = require('./constants/events');

const STATS = {
    total: 'total',
    updated: 'updated',
    passed: 'passed',
    failed: 'failed',
    skipped: 'skipped',
    retries: 'retries'
};

module.exports = class Stats {
    static create() {
        return new Stats();
    }

    constructor() {
        this._stats = {};
    }

    attachRunner(runner) {
        runner
            .on(RunnerEvents.SKIP_STATE, (test) => this._addStat(STATS.skipped, test))
            .on(RunnerEvents.ERROR, (test) => this._addStat(STATS.failed, test))
            .on(RunnerEvents.UPDATE_RESULT, (test) => {
                return test.updated ? this._addStat(STATS.updated, test) : this._addStat(STATS.passed, test);
            })
            .on(RunnerEvents.TEST_RESULT, (test) => {
                return test.equal ? this._addStat(STATS.passed, test) : this._addStat(STATS.failed, test);
            })
            .on(RunnerEvents.RETRY, (test) => this._getSuiteStats(test).retries++);
    }

    _addStat(stat, test) {
        this._getSuiteStats(test).states[test.state.name] = stat;
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
        return `${test.suite.fullName} ${test.browserId}`;
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
