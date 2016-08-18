'use strict';

var inherit = require('inherit'),
    _ = require('lodash'),
    q = require('q'),
    BrowserAgent = require('./browser-agent'),
    Runner = require('../runner'),
    SuiteRunner = require('../suite-runner'),

    promiseUtils = require('q-promise-utils'),
    RunnerEvents = require('../../constants/runner-events'),
    PrivateEvents = require('../private-events'),
    pool = require('../../browser-pool'),

    log = require('debug')('gemini:runner');

var BrowserRunner = inherit(Runner, {
    __constructor: function(browserId, config, browserPool) {
        this._browserId = browserId;
        this._config = config;
        this._browserAgent = BrowserAgent.create(browserId, browserPool);
        this._suiteRunners = [];
    },

    run: function(suites, stateProcessor) {
        log('start browser %s', this._browserId);
        this.emit(RunnerEvents.START_BROWSER, {browserId: this._browserId});
        return this._runSuites(suites, stateProcessor)
            .fin(() => {
                log('stop browser %s', this._browserId);
                this.emit(RunnerEvents.STOP_BROWSER, {browserId: this._browserId});
            });
    },

    cancel: function() {
        this._runSuite = this._doNothing;
        this._suiteRunners.forEach(function(runner) {
            runner.cancel();
        });
    },

    _doNothing: function() {
        return q.resolve();
    },

    _runSuites: function(suites, stateProcessor) {
        var _this = this;

        return _(suites)
            .filter(function(suite) {
                return _.contains(suite.browsers, _this._browserId);
            })
            .map(function(suite) {
                return _this._tryToRunSuite(suite, stateProcessor);
            })
            .thru(promiseUtils.waitForResults)
            .value();
    },

    _tryToRunSuite: function(suite, stateProcessor) {
        var _this = this;

        return _this._runSuite(suite, stateProcessor)
            .fail(function(e) {
                if (e instanceof pool.CancelledError) {
                    log('critical error %o in %s', e, _this._browserId);
                    return;
                }

                return _this.emitAndWait(PrivateEvents.CRITICAL_ERROR, _.extend(e, {
                    suite: suite,
                    browserId: _this._browserId
                }));
            });
    },

    _runSuite: function(suite, stateProcessor) {
        var runner = SuiteRunner.create(suite, this._browserAgent, this._config);

        this.passthroughEvent(runner, [
            RunnerEvents.BEGIN_SUITE,
            RunnerEvents.END_SUITE,
            RunnerEvents.SKIP_STATE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.END_TEST,
            RunnerEvents.CAPTURE,
            RunnerEvents.UPDATE_RESULT,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR
        ]);

        this._suiteRunners.push(runner);
        return runner.run(stateProcessor);
    }
}, {
    create: function(browserId, config, browserPool) {
        return new BrowserRunner(browserId, config, browserPool);
    }
});

module.exports = BrowserRunner;
