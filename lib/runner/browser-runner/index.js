'use strict';

const _ = require('lodash');
const q = require('q');
const BrowserAgent = require('./browser-agent');
const Runner = require('../runner');
const SuiteRunner = require('../suite-runner');

const promiseUtils = require('q-promise-utils');
const RunnerEvents = require('../../constants/runner-events');
const PrivateEvents = require('../private-events');
const CancelledError = require('../../errors/cancelled-error');

const log = require('debug')('gemini:runner');

module.exports = class BrowserRunner extends Runner {
    constructor(browserId, config, browserPool) {
        super();

        this._browserId = browserId;
        this._config = config;
        this._browserAgent = BrowserAgent.create(browserId, browserPool);
        this._suiteRunners = [];
    }

    static create(browserId, config, browserPool) {
        return new BrowserRunner(browserId, config, browserPool);
    }

    run(suiteCollection, stateProcessor) {
        log('start browser %s', this._browserId);
        this.emit(RunnerEvents.START_BROWSER, {browserId: this._browserId});
        return this._runSuites(suiteCollection, stateProcessor)
            .finally(() => {
                log('stop browser %s', this._browserId);
                this.emit(RunnerEvents.STOP_BROWSER, {browserId: this._browserId});
            });
    }

    cancel() {
        this._runSuite = this._doNothing;
        this._suiteRunners.forEach((runner) => runner.cancel());
    }

    _doNothing() {
        return q();
    }

    _runSuites(suiteCollection, stateProcessor) {
        const suites = suiteCollection.clone().allSuites();

        return _(suites)
            .filter((suite) => _.includes(suite.browsers, this._browserId))
            .map((suite) => this._tryToRunSuite(suite, stateProcessor))
            .thru(promiseUtils.waitForResults)
            .value();
    }

    _tryToRunSuite(suite, stateProcessor) {
        return this._runSuite(suite, stateProcessor)
            .catch((e) => {
                if (e instanceof CancelledError) {
                    log('critical error %o in %s', e, this._browserId);
                    return;
                }

                return this.emitAndWait(PrivateEvents.CRITICAL_ERROR, _.extend(e, {
                    suite: suite,
                    browserId: this._browserId
                }));
            });
    }

    _runSuite(suite, stateProcessor) {
        const runner = SuiteRunner.create(suite, this._browserAgent, this._config);

        this.passthroughEvent(runner, [
            RunnerEvents.BEGIN_SUITE,
            RunnerEvents.END_SUITE,
            RunnerEvents.SKIP_STATE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.TEST_RESULT,
            RunnerEvents.CAPTURE,
            RunnerEvents.UPDATE_RESULT,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR
        ]);

        this._suiteRunners.push(runner);
        return runner.run(stateProcessor);
    }
};
