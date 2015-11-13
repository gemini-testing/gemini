'use strict';
var _ = require('lodash'),
    q = require('q'),
    inherit = require('inherit'),

    Runner = require('./runner'),
    TestSessionRunner = require('./test-session-runner'),

    Coverage = require('../coverage'),

    RunnerEvents = require('../constants/runner-events'),
    PrivateEvents = require('./private-events');

module.exports = inherit(Runner, {

    __constructor: function(config) {
        this.config = config;

        this.coverage = this.config.isCoverageEnabled() && new Coverage(config);
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
            RunnerEvents.START_BROWSER,
            RunnerEvents.STOP_BROWSER,
            RunnerEvents.INFO,
            RunnerEvents.BEGIN_SUITE,
            RunnerEvents.END_SUITE,
            RunnerEvents.SKIP_STATE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR
        ]);

        sessionRunner.on(PrivateEvents.CAPTURE_DATA, function(data) {
            if (this.coverage) {
                this.coverage.addStatsForBrowser(data.coverage, data.browser);
            }
            return q(this._processCapture(data));
        }.bind(this));

        return sessionRunner.run(suites);
    },

    _prepare: _.noop,
    _processCapture: _.noop
});
