'use strict';

const _ = require('lodash');
const q = require('q');
const Runner = require('./runner');
const BrowserRunner = require('./browser-runner');

const promiseUtils = require('q-promise-utils');
const RunnerEvents = require('../constants/runner-events');
const PrivateEvents = require('./private-events');
const pool = require('../browser-pool');
const SuiteMonitor = require('../suite-monitor');

module.exports = class TestSessionRunner extends Runner {
    constructor(config, testBrowsers) {
        super();

        this.browserPool = pool.create(config);

        this.monitor = new SuiteMonitor(this);
        this.passthroughEvent(this.monitor, RunnerEvents.END_SUITE);

        const allBrowsers = config.getBrowserIds();
        const browsersToRun = testBrowsers ? _.intersection(testBrowsers, allBrowsers) : allBrowsers;

        this._browserRunners = browsersToRun.map((browserId) => this._initBrowserRunner(browserId, config));
    }

    static create(config, testBrowsers) {
        return new TestSessionRunner(config, testBrowsers);
    }

    _initBrowserRunner(browserId, config) {
        const runner = BrowserRunner.create(browserId, config, this.browserPool);
        this.passthroughEvent(runner, [
            RunnerEvents.START_BROWSER,
            RunnerEvents.STOP_BROWSER,
            RunnerEvents.INFO,
            RunnerEvents.SKIP_STATE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.TEST_RESULT,
            RunnerEvents.CAPTURE,
            RunnerEvents.UPDATE_RESULT,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR,
            PrivateEvents.CRITICAL_ERROR
        ]);

        this.passthroughEvent(runner, RunnerEvents.BEGIN_SUITE);
        runner.on(RunnerEvents.END_SUITE, (data) => this.monitor.suiteFinished(data.suite, data.browserId));

        return runner;
    }

    run(suiteCollection, stateProcessor) {
        this.emit(RunnerEvents.BEGIN_SESSION);

        return _(this._browserRunners)
            .map((runner) => this._runBrowserRunner(runner, suiteCollection, stateProcessor))
            .thru(promiseUtils.waitForResults)
            .value()
            .finally(() => this.emit(RunnerEvents.END_SESSION));
    }

    _runBrowserRunner(runner, suiteCollection, stateProcessor) {
        return runner.run(suiteCollection, stateProcessor)
            .catch((e) => {
                this._cancel();
                return q.reject(e);
            });
    }

    _cancel() {
        this._browserRunners.forEach((runner) => runner.cancel());
        this.browserPool.cancel();
    }
};
