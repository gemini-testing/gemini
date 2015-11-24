'use strict';
var _ = require('lodash'),
    q = require('q'),
    inherit = require('inherit'),

    Runner = require('./runner'),
    TestSessionRunner = require('./test-session-runner'),

    Tester = require('../capture-processor/tester'),
    ScreenShooter = require('../capture-processor/screen-shooter'),

    FailCollector = require('../fail-collector'),

    Coverage = require('../coverage'),

    RunnerEvents = require('../constants/runner-events'),
    PrivateEvents = require('./private-events');

var TestsRunner = inherit(Runner, {

    __constructor: function(config, captureProcessor) {
        this.config = config;
        this._captureProcessor = captureProcessor;
        this._failCollector = new FailCollector(config);
        this.coverage = this.config.isCoverageEnabled() && new Coverage(config);

        this.passthroughEvent(this._failCollector, RunnerEvents.RETRY);
    },

    setTestBrowsers: function(browsers) {
        this._testBrowsers = browsers;
    },

    /**
     * @param {Suite[]} suites
     * @returns {*}
     */
    run: function(suites) {
        var _this = this;

        return q.fcall(function() {
            _this.emit(RunnerEvents.BEGIN, {
                config: _this.config,
                totalStates: _.reduce(suites, function(result, suite) {
                    return result + suite.states.length;
                }, 0),
                browserIds: _this.config.getBrowserIds()
            });
        }).then(function() {
            return _this._prepare();
        })
        .then(function() {
            return _this._runTestSession(suites);
        })
        .then(function() {
            return _this.coverage && _this.coverage.processStats();
        })
        .fin(function() {
            _this.emit(RunnerEvents.END);
        });
    },

    _runTestSession: function(suites) {
        var sessionRunner = TestSessionRunner.create(this.config, this._testBrowsers);

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

        sessionRunner.on(RunnerEvents.ERROR, this._handleError.bind(this));
        sessionRunner.on(PrivateEvents.CRITICAL_ERROR, this._handleCriticalError.bind(this));
        sessionRunner.on(PrivateEvents.CAPTURE_DATA, this._handleCapture.bind(this));

        var _this = this;
        return sessionRunner.run(suites).then(function() {
            return _this._failCollector.retry(_this._runTestSession.bind(_this));
        });
    },

    _prepare: function() {
        return this._captureProcessor.prepare();
    },

    _handleCapture: function(capture) {
        if (this.coverage) {
            this.coverage.addStatsForBrowser(capture.coverage, capture.browser);
        }

        var _this = this;
        return this._captureProcessor.processCapture(capture).then(function(processed) {
            if (!_this._failCollector.tryToSubmitCapture(processed)) {
                _this.emit(_this._captureProcessor.getProcessedCaptureEventName(), processed);
            }
        });
    },

    _handleError: function(error) {
        if (!this._failCollector.tryToSubmitError(error)) {
            this.emit(RunnerEvents.ERROR, error);
        }
    },

    _handleCriticalError: function(critical) {
        if (!this._failCollector.tryToSubmitError(critical)) {
            this.emit(RunnerEvents.ERROR, critical);
            return q.reject(critical);
        }
        return q.resolve();
    }
}, {
    createTester: function(config, options) {
        return new TestsRunner(config, new Tester(config, options));
    },

    createScreenShooter: function(config) {
        return new TestsRunner(config, new ScreenShooter(config));
    }
});

module.exports = TestsRunner;
