'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const CaptureSession = require('../../capture-session');

const Events = require('../../constants/events');

const SuiteRunner = require('./suite-runner');
const StateRunner = require('../state-runner');

const cloneError = require('../../errors/utils').cloneError;
const NoRefImageError = require('../../errors/no-ref-image-error');

module.exports = class RegularSuiteRunner extends SuiteRunner {
    static create(suite, browserAgent, config) {
        return new RegularSuiteRunner(suite, browserAgent, config);
    }

    constructor(suite, browserAgent, config) {
        super(suite, browserAgent);

        this._config = config;
        this._session = null;
        this._brokenSession = false;
    }

    _doRun(stateProcessor) {
        return this._browserAgent.getBrowser()
            .then((browser) => this._initSession(browser))
            .then(() => this._processStates(stateProcessor))
            .catch((e) => {
                this._validateSession(e);

                return this._passErrorToStates(e);
            })
            .finally(() => this._session
                && this._browserAgent.freeBrowser(this._session.browser, {force: this._brokenSession}));
    }

    _initSession(browser) {
        this._session = new CaptureSession(browser);
    }

    _passErrorToStates(e) {
        return this._suite.states.map((state) => {
            return this.emit(Events.ERROR, _.extend(cloneError(e), {
                suite: state.suite,
                state: state,
                browserId: this._browserAgent.browserId
            }));
        });
    }

    _processStates(stateProcessor) {
        const browser = this._session.browser;

        return browser.openRelative(this._suite.url)
            .then(() => this._runBeforeActions())
            .then(() => this._runStates(stateProcessor))
            .then(() => this._runAfterActions(), this._keepPassedError(this._runAfterActions))
            .then(() => this._runPostActions(), this._keepPassedError(this._runPostActions))
            .catch((e) => {
                return Promise.reject(_.extend(e, {
                    browserId: browser.id,
                    sessionId: browser.sessionId
                }));
            });
    }

    _runBeforeActions() {
        return this._session.runActions(this._suite.beforeActions);
    }

    _runAfterActions() {
        return this._session.runActions(this._suite.afterActions);
    }

    _runPostActions() {
        return this._session.runPostActions();
    }

    _keepPassedError(fn) {
        return (e) => Promise.try(() => fn.call(this))
            .finally(() => Promise.reject(e));
    }

    _runStates(stateProcessor) {
        return Promise.mapSeries(this._suite.states, (state) => this._runStateInSession(state, stateProcessor));
    }

    _validateSession(error) {
        if (!(error instanceof NoRefImageError)) {
            this._brokenSession = true;
        }
    }

    _runStateInSession(state, stateProcessor) {
        const runner = StateRunner.create(state, this._session, this._config);

        this.passthroughEvent(runner, [
            Events.SKIP_STATE,
            Events.BEGIN_STATE,
            Events.END_STATE,
            Events.TEST_RESULT,
            Events.CAPTURE,
            Events.UPDATE_RESULT,
            Events.WARNING
        ]);

        runner.on(Events.ERROR, (e) => {
            this._validateSession(e);

            this.emit(Events.ERROR, e);
        });

        return runner.run(stateProcessor);
    }
};
