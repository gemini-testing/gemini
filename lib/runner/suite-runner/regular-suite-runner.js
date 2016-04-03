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

    _doRun: function(stateProcessor) {
        var _this = this;
        return this._browserAgent.getBrowser()
            .then(function(browser) {
                return _this._runStates(browser, stateProcessor)
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

    _runStates: function(browser, stateProcessor) {
        if (!this._suite.hasStates) {
            return q.resolve();
        }

        var _this = this,
            session = new CaptureSession(browser);

        return browser.openRelative(this._suite.url)
            .then(runBeforeActions_)
            .then(function() {
                return runStates_()
                    .then(runAfterActions_, keepPassedError_(runAfterActions_))
                    .then(runPostActions_, keepPassedError_(runPostActions_));
            })
            .fail(function(e) {
                return q.reject(_.extend(e, {
                    browserId: browser.id,
                    sessionId: browser.sessionId
                }));
            }.bind(this));

        function runBeforeActions_() {
            return session.runActions(_this._suite.beforeActions);
        }

        function runStates_() {
            return promiseUtils.seqMap(_this._suite.states, function(state) {
                    return _this._runStateInSession(state, session, stateProcessor);
                });
        }

        function runAfterActions_() {
            return session.runActions(_this._suite.afterActions);
        }

        function runPostActions_() {
            return session.runPostActions();
        }

        function keepPassedError_(fn) {
            return function(e) {
                return q.when(fn()).fin(q.reject.bind(null, e));
            };
        }
    },

    _runStateInSession: function(state, session, stateProcessor) {
        var runner = StateRunner.create(state, session, this._config);

        this.passthroughEvent(runner, [
            RunnerEvents.SKIP_STATE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR,
            PrivateEvents.STATE_RESULT,
            PrivateEvents.CRITICAL_ERROR
        ]);

        return runner.run(stateProcessor);
    }
});

module.exports = RegularSuiteRunner;
