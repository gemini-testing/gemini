'use strict';

const _ = require('lodash');
const {promiseUtils} = require('gemini-core');

const pool = require('../browser-pool');
const BrowserRunner = require('./browser-runner');
const Events = require('../constants/events');
const Coverage = require('../coverage');
const Runner = require('./runner');
const RunnerStats = require('../stats');
const SuiteMonitor = require('../suite-monitor');

module.exports = class TestsRunner extends Runner {
    static create(config, stateProcessor) {
        return new TestsRunner(config, stateProcessor);
    }

    constructor(config, stateProcessor) {
        super();

        this.config = config;
        this.coverage = this.config.isCoverageEnabled() && Coverage.create(config);

        this._stateProcessor = stateProcessor;

        this._stats = RunnerStats.create();
        this._stats.attachRunner(this);

        this._browserPool = pool.create(this.config, this);

        this._suiteMonitor = SuiteMonitor.create(this);
        this.passthroughEvent(this._suiteMonitor, Events.END_SUITE);

        this._browserRunners = [];
    }

    run(suiteCollection) {
        return this.emitAndWait(Events.START_RUNNER, this)
            .then(() => this.emit(Events.BEGIN, this._formatBeginEventData(suiteCollection)))
            .then(() => this._stateProcessor.prepare(this))
            .then(() => !this._cancelled && this._runTests(suiteCollection))
            .then(() => this.coverage && this.coverage.processStats())
            .finally(() => {
                this.emit(Events.END, this._stats.getResult());
                return this.emitAndWait(Events.END_RUNNER, this);
            });
    }

    _formatBeginEventData(suiteCollection) {
        return {
            suiteCollection,
            config: this.config,
            totalStates: _.sumBy(suiteCollection.allSuites(), (suite) => suite.states.length),
            browserIds: this.config.getBrowserIds()
        };
    }

    _runTests(suiteCollection) {
        return _(this._getBrowsersToRun())
            .map((browserId) => this._runTestsInBrowser(suiteCollection, browserId))
            .thru(promiseUtils.waitForResults)
            .value();
    }

    _getBrowsersToRun() {
        const allBrowsers = this.config.getBrowserIds();
        const testBrowsers = this._testBrowsers;

        return testBrowsers ? _.intersection(testBrowsers, allBrowsers) : allBrowsers;
    }

    _runTestsInBrowser(suiteCollection, browserId) {
        const runner = BrowserRunner.create(browserId, this.config, this._browserPool);

        this.passthroughEvent(runner, [
            Events.RETRY,
            Events.START_BROWSER,
            Events.STOP_BROWSER,
            Events.BEGIN_SUITE,
            Events.SKIP_STATE,
            Events.BEGIN_STATE,
            Events.END_STATE,
            Events.INFO,
            Events.ERROR
        ]);

        runner.on(Events.END_SUITE, (data) => this._suiteMonitor.suiteFinished(data.suite, data.browserId));

        runner.on(Events.TEST_RESULT, (result) => this._handleResult(result, Events.TEST_RESULT));
        runner.on(Events.UPDATE_RESULT, (result) => this._handleResult(result, Events.UPDATE_RESULT));

        this._browserRunners.push(runner);
        return runner.run(suiteCollection, this._stateProcessor);
    }

    _handleResult(result, event) {
        this._saveCoverage(result);
        this.emit(event, result);
    }

    _saveCoverage(data) {
        if (this.coverage) {
            this.coverage.addStatsForBrowser(data.coverage, data.browserId);
        }
    }

    cancel() {
        this._cancelled = true;

        this._browserRunners.forEach((runner) => runner.cancel());

        this._browserPool.cancel();
    }
};
