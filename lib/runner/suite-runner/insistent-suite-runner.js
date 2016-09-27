'use strict';

const SuiteRunner = require('./suite-runner');
const RegularSuiteRunner = require('./regular-suite-runner');
const SuiteCollection = require('../../suite-collection');
const Events = require('../../constants/events');
const CancelledError = require('../../errors/cancelled-error');
const NoRefImageError = require('../../errors/no-ref-image-error');
const q = require('q');
const _ = require('lodash');

module.exports = class InsistentSuiteRunner extends SuiteRunner {
    static create(suite, browserAgent, config) {
        return new InsistentSuiteRunner(suite, browserAgent, config);
    }

    constructor(suite, browserAgent, config) {
        super(suite, browserAgent);

        this._config = config;
        this._retries = config.forBrowser(browserAgent.browserId).retry;
        this._retriesPerformed = 0;
    }

    cancel() {
        this._suiteRunner.cancel();
    }

    _doRun(stateProcessor) {
        this._suiteRunner = this._initSuiteRunner();
        this._shouldRetry = false;

        return this._suiteRunner.run(stateProcessor)
            .catch((e) => this._handleError(e) || q.reject(e))
            .then(() => this._retry(stateProcessor));
    }

    _initSuiteRunner() {
        this._disablePassedStates(this._suite);

        const runner = RegularSuiteRunner.create(this._suite, this._browserAgent, this._config);

        this._handleEvent(runner, Events.ERROR, (e) => e instanceof NoRefImageError);
        this._handleEvent(runner, Events.TEST_RESULT, (r) => r.equal);

        this.passthroughEvent(runner, [
            Events.BEGIN_STATE,
            Events.SKIP_STATE,
            Events.END_STATE,
            Events.CAPTURE,
            Events.UPDATE_RESULT,
            Events.WARNING
        ]);

        return runner;
    }

    _handleEvent(runner, event, shouldPassthrough) {
        runner.on(event, (data) => {
            if (shouldPassthrough(data) || !this._submitForRetry(data)) {
                this._emit(event, data);
            }
        });
    }

    _handleError(e) {
        if (e instanceof CancelledError) {
            this._shouldRetry = false;
            return true;
        }

        if (this._submitForRetry(e)) {
            return true;
        }

        this._emit(Events.ERROR, e);
        return false;
    }

    _retry(stateProcessor) {
        if (!this._shouldRetry) {
            return;
        }

        ++this._retriesPerformed;
        return this._doRun(stateProcessor);
    }

    _disablePassedStates(suite) {
        if (!_.isArray(this._shouldRetry)) {
            return;
        }

        const collection = new SuiteCollection([suite]).disableAll();
        const browser = this._browserAgent.browserId;
        this._shouldRetry.forEach((state) => collection.enable(suite, {state, browser}));
    }

    _submitForRetry(e) {
        const retriesLeft = this._retries - this._retriesPerformed;
        if (!retriesLeft) {
            return false;
        }

        this._shouldRetry = this._shouldRetry === true
            || !e.state
            || (this._shouldRetry || []).concat(e.state.name);

        this._emit(Events.RETRY, _.extend(e, {attempt: this._retriesPerformed, retriesLeft}));
        return true;
    }
};
