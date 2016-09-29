'use strict';

const _ = require('lodash');
const q = require('q');
const Runner = require('./runner');
const TestSessionRunner = require('./test-session-runner');
const Coverage = require('../coverage');
const Events = require('../constants/events');

module.exports = class TestsRunner extends Runner {
    static create(config, stateProcessor) {
        return new TestsRunner(config, stateProcessor);
    }

    constructor(config, stateProcessor) {
        super();

        this.config = config;
        this._stateProcessor = stateProcessor;
        this.coverage = this.config.isCoverageEnabled() && new Coverage(config);
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
            this.emit(Events.START_RUNNER, this);
            this.emit(Events.BEGIN, {
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
            this.emit(Events.END);
            this.emit(Events.END_RUNNER, this);
        });
    }

    _runTestSession(suiteCollection) {
        const sessionRunner = TestSessionRunner.create(this.config, this._testBrowsers);

        this.passthroughEvent(sessionRunner, [
            Events.BEGIN_SESSION,
            Events.END_SESSION,
            Events.START_BROWSER,
            Events.STOP_BROWSER,
            Events.INFO,
            Events.BEGIN_SUITE,
            Events.END_SUITE,
            Events.SKIP_STATE,
            Events.BEGIN_STATE,
            Events.END_STATE,
            Events.ERROR,
            Events.WARNING,
            Events.RETRY
        ]);

        sessionRunner.on(Events.TEST_RESULT, (result) => this._handleTestResult(result));
        sessionRunner.on(Events.CAPTURE, (result) => this._handleCapture(result));
        sessionRunner.on(Events.UPDATE_RESULT, (result) => this._handleUpdateResult(result));

        return sessionRunner.run(suiteCollection, this._stateProcessor);
    }

    _prepare() {
        return this._stateProcessor.prepare(this);
    }

    _handleTestResult(result) {
        this._saveCoverage(result);

        this.emit(Events.END_TEST, result);
        this.emit(Events.TEST_RESULT, result);
    }

    _handleCapture(result) {
        this._saveCoverage(result);
        this.emit(Events.CAPTURE, result);
    }

    _handleUpdateResult(result) {
        this._saveCoverage(result);
        this.emit(Events.UPDATE_RESULT, result);
    }

    _saveCoverage(data) {
        if (this.coverage) {
            this.coverage.addStatsForBrowser(data.coverage, data.browserId);
        }
    }
};
