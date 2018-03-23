'use strict';

const _ = require('lodash');

const SuiteRunner = require('./suite-runner');
const RegularSuiteRunner = require('./regular-suite-runner');
const SuiteCollection = require('../../suite-collection');
const Events = require('../../constants/events');
const NoRefImageError = require('../../errors/no-ref-image-error');

module.exports = class InsistentSuiteRunner extends SuiteRunner {
    static create(suite, browserAgent, config) {
        return new InsistentSuiteRunner(suite, browserAgent, config);
    }

    constructor(suite, browserAgent, config) {
        super(suite, browserAgent);

        this._config = config;
        this._retriesPerformed = 0;
    }

    _doRun(stateProcessor) {
        this._suiteRunner = this._initSuiteRunner();
        this._statesToRetry = [];

        return this._suiteRunner.run(stateProcessor)
            .then(() => this._retry(stateProcessor));
    }

    _initSuiteRunner() {
        this._disablePassedStates(this._suite);

        const runner = RegularSuiteRunner.create(this._suite, this._browserAgent);

        this._handleEvent(runner, Events.ERROR, (e) => e instanceof NoRefImageError);
        this._handleEvent(runner, Events.TEST_RESULT, (r) => r.equal);

        this.passthroughEvent(runner, [
            Events.BEGIN_STATE,
            Events.SKIP_STATE,
            Events.END_STATE,
            Events.UPDATE_RESULT
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

    _retry(stateProcessor) {
        if (_.isEmpty(this._statesToRetry) || this._cancelled) {
            return;
        }

        ++this._retriesPerformed;
        return this._doRun(stateProcessor);
    }

    _disablePassedStates(suite) {
        if (_.isEmpty(this._statesToRetry)) {
            return;
        }

        const browser = this._browserAgent.browserId;
        const collection = new SuiteCollection([suite]);
        suite.states.forEach((state) => collection.disable(suite, {state: state.name}));
        this._statesToRetry.forEach((state) => collection.enable(suite, {state, browser}));
    }

    _shouldRetry(data) {
        if (typeof this._config.shouldRetry === 'function') {
            return this._config.shouldRetry(data);
        }

        return data.retriesLeft > 0;
    }

    _submitForRetry(data) {
        Object.assign(data, {
            attempt: this._retriesPerformed,
            retriesLeft: this._config.retry - this._retriesPerformed
        });

        if (!this._shouldRetry(data)) {
            return false;
        }

        this._statesToRetry = this._statesToRetry.concat(data.state.name);

        this._emit(Events.RETRY, data);
        return true;
    }
};
