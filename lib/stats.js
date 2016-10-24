'use strict';

const RunnerEvents = require('./constants/events');
const TestCounter = require('./test-counter');

module.exports = class Stats {
    constructor(runner) {
        this._counter = new TestCounter();

        runner
            .on(RunnerEvents.SKIP_STATE, (test) => this._counter.onSkipped(test))
            .on(RunnerEvents.WARNING, (test) => this._counter.onWarned(test))
            .on(RunnerEvents.ERROR, (test) => this._counter.onErrored(test))
            .on(RunnerEvents.UPDATE_RESULT, (test) => {
                return test.updated ? this._counter.onUpdated(test) : this._counter.onPassed(test);
            })
            .on(RunnerEvents.TEST_RESULT, (test) => {
                return test.equal ? this._counter.onPassed(test) : this._counter.onFailed(test);
            })
            .on(RunnerEvents.RETRY, (test) => this._counter.onRetry(test));
    }

    get(type) {
        const stats = this._counter.getResult();

        return type === undefined ? stats : stats[type];
    }
};
