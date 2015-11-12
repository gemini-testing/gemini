'use strict';

var inherit = require('inherit'),
    q = require('q'),
    Runner = require('./runner'),
    StateRunner = require('./state-runner'),

    CaptureSession = require('../capture-session'),
    promiseUtils = require('../promise-util'),

    RunnerEvents = require('../constants/runner-events'),
    PrivateEvents = require('./private-events');

var SuiteRunner = inherit(Runner, {
    __constructor: function(browser, config) {
        this._browser = browser;
        this._config = config;
    },

    run: function(suite) {
        var _this = this,
            eventData = {
                suite: suite,
                browserId: this._browser.id
            };

        this.emit(RunnerEvents.BEGIN_SUITE, eventData);

        return this._runStates(suite, this._browser)
            .fin(function() {
                _this.emit(RunnerEvents.END_SUITE, {suite: suite, browserId: _this._browser.id});
            });
    },

    cancel: function() {
        this._runStateInSession = this._doNothing;
    },

    _doNothing: function() {
        return q.resolve();
    },

    _runStates: function(suite) {
        if (!suite.hasStates) {
            return q.resolve();
        }

        var _this = this,
            session = new CaptureSession(this._browser);

        return this._browser.openRelative(suite.url)
            .then(function() {
                return session.runHook(suite.beforeHook, suite);
            })
            .then(function() {
                return promiseUtils.seqMap(suite.states, function(state) {
                        return _this._runStateInSession(state, session);
                    })
                    .fin(function() {
                        return session.runHook(suite.afterHook, suite);
                    })
                    .fin(function() {
                        return suite.runPostActions();
                    });
            });
    },

    _runStateInSession: function(state, session) {
        var runner = StateRunner.create(session, this._config);

        this._passthroughEvent(runner, RunnerEvents.SKIP_STATE);
        this._passthroughEvent(runner, RunnerEvents.BEGIN_STATE);
        this._passthroughEvent(runner, RunnerEvents.END_STATE);
        this._passthroughEvent(runner, RunnerEvents.WARNING);
        this._passthroughEvent(runner, RunnerEvents.ERROR);
        this._passthroughEvent(runner, PrivateEvents.CAPTURE_DATA);

        return runner.run(state);
    }
}, {
    create: function(browser, config) {
        return new SuiteRunner(browser, config);
    }
});

module.exports = SuiteRunner;
