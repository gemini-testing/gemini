'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
    q = require('q'),
    SuiteRunner = require('./suite-runner'),
    StateRunner = require('../state-runner'),

    CaptureSession = require('../../capture-session'),
    promiseUtils = require('q-promise-utils'),

    RunnerEvents = require('../../constants/runner-events'),
    PrivateEvents = require('../private-events');

var RegularSuiteRunner = inherit(SuiteRunner, {
    __constructor: function(suite, browserAgent, config) {
        this.__base(suite, browserAgent);
        this._config = config;
    },

    _doRun: function() {
        var _this = this;
        return this._browserAgent.getBrowser()
            .then(function(browser) {
                return _this._runStates(browser)
                    .fin(function() {
                        return _this._browserAgent.freeBrowser(browser);
                    });
            });
    },

    cancel: function() {
        this._runStateInSession = this._doNothing;
    },

    _doNothing: function() {
        return q.resolve();
    },

    _runStates: function(browser) {
        if (!this._suite.hasStates) {
            return q.resolve();
        }

        var _this = this,
            session = new CaptureSession(browser);

        return browser.openRelative(this._suite.url)
            .then(runBeforeHook_)
            .then(function() {
                return runStates_()
                    .then(runAfterHook_, keepPassedError_(runAfterHook_))
                    .then(runPostActions_, keepPassedError_(runPostActions_));
            })
            .fail(function(e) {
                return q.reject(_.extend(e, {
                    browserId: browser.id,
                    sessionId: browser.sessionId
                }));
            }.bind(this));

        function runBeforeHook_() {
            return session.runHook(_this._suite.beforeHook, _this._suite);
        }

        function runStates_() {
            return promiseUtils.seqMap(_this._suite.states, function(state) {
                    return _this._runStateInSession(state, session);
                });
        }

        function runAfterHook_() {
            return session.runHook(_this._suite.afterHook, _this._suite);
        }

        function runPostActions_() {
            return _this._suite.runPostActions();
        }

        function keepPassedError_(fn) {
            return function(e) {
                return q.when(fn()).fin(q.reject.bind(null, e));
            };
        }
    },

    _runStateInSession: function(state, session) {
        var runner = StateRunner.create(state, session, this._config);

        this.passthroughEvent(runner, [
            RunnerEvents.SKIP_STATE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR,
            PrivateEvents.CAPTURE_DATA,
            PrivateEvents.CRITICAL_ERROR
        ]);

        return runner.run();
    }
});

module.exports = RegularSuiteRunner;
