'use strict';

const _ = require('lodash');
const q = require('q');

const Runner = require('./runner');
const TestSessionRunner = require('./test-session-runner');

const FailCollector = require('../fail-collector');

const Coverage = require('../coverage');

const RunnerEvents = require('../constants/runner-events');
const PrivateEvents = require('./private-events');

module.exports = class TestsRunner extends Runner {
    static create(config, stateProcessor) {
        return new TestsRunner(config, stateProcessor);
    }

    constructor(config, stateProcessor) {
        super();

        this.config = config;
        this._stateProcessor = stateProcessor;
        this._failCollector = new FailCollector(config);
        this.coverage = this.config.isCoverageEnabled() && new Coverage(config);

        this.passthroughEvent(this._failCollector, RunnerEvents.RETRY);
    }

    setTestBrowsers(browsers) {
        this._testBrowsers = browsers;
    }

    /**
     * @param {SuiteCollection} SuiteCollection
     * @returns {*}
     */
    run(suiteCollection) {
        const suites = suiteCollection.allSuites();

        return q.fcall(() => {
            this.emit(RunnerEvents.START_RUNNER, this);
            this.emit(RunnerEvents.BEGIN, {
                config: this.config,
                totalStates: _.reduce(suites, (result, suite) => {
                    return result + suite.states.length;
                }, 0),
                browserIds: this.config.getBrowserIds()
            });
        })
        .then(() => this._prepare())
        .then(() => this._runTestSession(suiteCollection))
        .then(() => this.coverage && this.coverage.processStats())
        .finally(() => {
            this.emit(RunnerEvents.END);
            this.emit(RunnerEvents.END_RUNNER, this);
        });
    }

    _runTestSession(suiteCollection) {
        const sessionRunner = TestSessionRunner.create(this.config, this._testBrowsers);

        this.passthroughEvent(sessionRunner, [
            RunnerEvents.BEGIN_SESSION,
            RunnerEvents.END_SESSION,
            RunnerEvents.START_BROWSER,
            RunnerEvents.STOP_BROWSER,
            RunnerEvents.INFO,
            RunnerEvents.BEGIN_SUITE,
            RunnerEvents.END_SUITE,
            RunnerEvents.SKIP_STATE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.WARNING
        ]);

        sessionRunner.on(RunnerEvents.TEST_RESULT, (result) => this._handleTestResult(result));
        sessionRunner.on(RunnerEvents.CAPTURE, (result) => this._handleCapture(result));
        sessionRunner.on(RunnerEvents.UPDATE_RESULT, (result) => this._handleUpdateResult(result));
        sessionRunner.on(RunnerEvents.ERROR, (error) => this._handleError(error));
        sessionRunner.on(PrivateEvents.CRITICAL_ERROR, (error) => this._handleCriticalError(error));

        return sessionRunner.run(suiteCollection, this._stateProcessor)
            .then(() => this._failCollector.retry((tests) => this._runTestSession(tests), suiteCollection));
    }

    _prepare() {
        return this._stateProcessor.prepare(this);
    }

    _handleTestResult(result) {
        this._saveCoverage(result);

        if (!this._failCollector.tryToSubmitStateResult(result)) {
            this.emit(RunnerEvents.END_TEST, result);
            this.emit(RunnerEvents.TEST_RESULT, result);
        }
    }

    _handleCapture(result) {
        this._saveCoverage(result);
        this.emit(RunnerEvents.CAPTURE, result);
    }

    _handleUpdateResult(result) {
        this._saveCoverage(result);
        this.emit(RunnerEvents.UPDATE_RESULT, result);
    }

    _saveCoverage(data) {
        if (this.coverage) {
            this.coverage.addStatsForBrowser(data.coverage, data.browserId);
        }
    }

    _handleError(error) {
        if (!this._failCollector.tryToSubmitError(error)) {
            this.emit(RunnerEvents.ERROR, error);
        }
    }

    _handleCriticalError(critical) {
        if (!this._failCollector.tryToSubmitError(critical)) {
            this.emit(RunnerEvents.ERROR, critical);
            return q.reject(critical);
        }
        return q();
    }
};
