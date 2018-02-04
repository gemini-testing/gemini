'use strict';

const {BaseStats} = require('gemini-core');
const RunnerEvents = require('./constants/events');

const statNames = {
    TOTAL: 'total',
    UPDATED: 'updated',
    PASSED: 'passed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
    RETRIES: 'retries'
};

module.exports = class Stats extends BaseStats {
    constructor() {
        super(statNames);
    }

    addUpdated(test) {
        return this._addStat(this._statNames.UPDATED, test);
    }

    attachRunner(runner) {
        runner
            .on(RunnerEvents.SKIP_STATE, (test) => this.addSkipped(test))
            .on(RunnerEvents.ERROR, (test) => this.addFailed(test))
            .on(RunnerEvents.UPDATE_RESULT, (test) => test.updated ? this.addUpdated(test) : this.addPassed(test))
            .on(RunnerEvents.TEST_RESULT, (test) => test.equal ? this.addPassed(test) : this.addFailed(test))
            .on(RunnerEvents.RETRY, () => this.addRetries());
    }

    _buildStateKey(test) {
        return test.state.name;
    }

    _buildSuiteKey(test) {
        return `${test.suite.fullName} ${test.browserId}`;
    }
};
