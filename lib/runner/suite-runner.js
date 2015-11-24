'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
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
                _this.emit(RunnerEvents.END_SUITE, eventData);
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
            .then(runBeforeHook_)
            .then(function() {
                return runStates_()
                    .then(runAfterHook_, keepPassedError_(runAfterHook_))
                    .then(runPostActions_, keepPassedError_(runPostActions_));
            })
            .fail(function(e) {
                return q.reject(_.extend(e, {
                    browserId: this._browser.id,
                    sessionId: this._browser.sessionId
                }));
            }.bind(this));

        function runBeforeHook_() {
            return session.runHook(suite.beforeHook, suite);
        }

        function runStates_() {
            return promiseUtils.seqMap(suite.states, function(state) {
                    return _this._runStateInSession(state, session);
                });
        }

        function runAfterHook_() {
            return session.runHook(suite.afterHook, suite);
        }

        function runPostActions_() {
            return suite.runPostActions();
        }

        function keepPassedError_(fn) {
            return function(e) {
                return q.when(fn()).fin(q.reject.bind(null, e));
            };
        }
    },

    _runStateInSession: function(state, session) {
        var runner = StateRunner.create(session, this._config);

        this.passthroughEvent(runner, [
            RunnerEvents.SKIP_STATE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR,
            PrivateEvents.CAPTURE_DATA,
            PrivateEvents.CRITICAL_ERROR
        ]);

        return runner.run(state);
    }
}, {
    create: function(browser, config) {
        return new SuiteRunner(browser, config);
    }
});

module.exports = SuiteRunner;
