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
        .fin(() => this.emit(RunnerEvents.END));
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

        sessionRunner.on(RunnerEvents.ERROR, (error) => this._handleError(error));
        sessionRunner.on(PrivateEvents.CRITICAL_ERROR, (error) => this._handleCriticalError(error));
        sessionRunner.on(PrivateEvents.STATE_RESULT, (result) => this._handleStateResult(result));

        const suites = suiteCollection.allSuites();
        return sessionRunner.run(suites, this._stateProcessor)
            .then(() => this._failCollector.retry((tests) => this._runTestSession(tests), suiteCollection));
    }

    _prepare() {
        return this._stateProcessor.prepare(this);
    }

    _handleStateResult(result) {
        if (this.coverage) {
            this.coverage.addStatsForBrowser(result.coverage, result.browserId);
        }

        if (!this._failCollector.tryToSubmitStateResult(result)) {
            this.emit(this._stateProcessor.jobDoneEvent, result);
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
