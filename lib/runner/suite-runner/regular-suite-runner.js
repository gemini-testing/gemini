'use strict';

const inherit = require('inherit');
const _ = require('lodash');
const q = require('q');
const promiseUtils = require('q-promise-utils');

const CaptureSession = require('../../capture-session');

const PrivateEvents = require('../private-events');
const RunnerEvents = require('../../constants/runner-events');

const SuiteRunner = require('./suite-runner');
const StateRunner = require('../state-runner');

const cloneError = require('../../errors/utils').cloneError;

const RegularSuiteRunner = inherit(SuiteRunner, {
    __constructor: function(suite, browserAgent, config) {
        this.__base(suite, browserAgent);
        this._config = config;

        this._session = null;
    },

    _doRun: function(stateProcessor) {
        return this._browserAgent.getBrowser()
            .then((browser) => this._initSession(browser))
            .then(() => this._processStates(stateProcessor))
            .catch((e) => this._passErrorToStates(e))
            .fin(() => this._session && this._browserAgent.freeBrowser(this._session.browser));
    },

    _initSession: function(browser) {
        this._session = new CaptureSession(browser);
    },

    _passErrorToStates: function(e) {
        return this._suite.states.map((state) => {
            return this.emit(RunnerEvents.ERROR, _.extend(cloneError(e), {
                suite: state.suite,
                state: state,
                browserId: this._browserAgent.browserId
            }));
        });
    },

    cancel: function() {
        this._runStateInSession = this._doNothing;
    },

    _doNothing: function() {
        return q.resolve();
    },

    _processStates: function(stateProcessor) {
        const browser = this._session.browser;

        return browser.openRelative(this._suite.url)
            .then(() => this._runBeforeActions())
            .then(() => this._runStates(stateProcessor))
            .then(() => this._runAfterActions(), this._keepPassedError(this._runAfterActions))
            .then(() => this._runPostActions(), this._keepPassedError(this._runPostActions))
            .catch((e) => {
                return q.reject(_.extend(e, {
                    browserId: browser.id,
                    sessionId: browser.sessionId
                }));
            });
    },

    _runBeforeActions: function() {
        return this._session.runActions(this._suite.beforeActions);
    },

    _runAfterActions: function() {
        return this._session.runActions(this._suite.afterActions);
    },

    _runPostActions: function() {
        return this._session.runPostActions();
    },

    _keepPassedError: function(fn) {
        return (e) => q.when(fn.call(this)).fin(() => q.reject(e));
    },

    _runStates: function(stateProcessor) {
        return promiseUtils.seqMap(this._suite.states, (state) => this._runStateInSession(state, stateProcessor));
    },

    _runStateInSession: function(state, stateProcessor) {
        const runner = StateRunner.create(state, this._session, this._config);

        this.passthroughEvent(runner, [
            RunnerEvents.SKIP_STATE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.END_TEST,
            RunnerEvents.CAPTURE,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR,
            PrivateEvents.CRITICAL_ERROR
        ]);

        return runner.run(stateProcessor);
    }
});

module.exports = RegularSuiteRunner;
