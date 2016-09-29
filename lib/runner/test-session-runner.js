'use strict';

const _ = require('lodash');
const q = require('bluebird-q');
const Runner = require('./runner');
const promiseUtils = require('q-promise-utils');
const BrowserRunner = require('./browser-runner');
const Events = require('../constants/events');
const pool = require('../browser-pool');
const SuiteMonitor = require('../suite-monitor');

module.exports = class TestSessionRunner extends Runner {
    constructor(config, testBrowsers) {
        super();

        this.browserPool = pool.create(config);

        this.monitor = new SuiteMonitor(this);
        this.passthroughEvent(this.monitor, Events.END_SUITE);

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
            Events.START_BROWSER,
            Events.STOP_BROWSER,
            Events.INFO,
            Events.SKIP_STATE,
            Events.BEGIN_STATE,
            Events.END_STATE,
            Events.TEST_RESULT,
            Events.CAPTURE,
            Events.UPDATE_RESULT,
            Events.WARNING,
            Events.ERROR,
            Events.RETRY
        ]);

        this.passthroughEvent(runner, Events.BEGIN_SUITE);
        runner.on(Events.END_SUITE, (data) => this.monitor.suiteFinished(data.suite, data.browserId));

        return runner;
    }

    run(suiteCollection, stateProcessor) {
        this.emit(Events.BEGIN_SESSION);

        return _(this._browserRunners)
            .map((runner) => this._runBrowserRunner(runner, suiteCollection, stateProcessor))
            .thru(promiseUtils.waitForResults)
            .value()
            .finally(() => this.emit(Events.END_SESSION));
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
