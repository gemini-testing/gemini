'use strict';

const _ = require('lodash');
const promiseUtils = require('q-promise-utils');
const BrowserAgent = require('./browser-agent');
const Runner = require('../runner');
const SuiteRunner = require('../suite-runner');
const Events = require('../../constants/events');

module.exports = class BrowserRunner extends Runner {
    constructor(browserId, config, browserPool) {
        super();

        this._browserId = browserId;
        this._config = config;
        this._browserPool = browserPool;
        this._suiteRunners = [];
    }

    static create(browserId, config, browserPool) {
        return new BrowserRunner(browserId, config, browserPool);
    }

    run(suiteCollection, stateProcessor) {
        const suites = suiteCollection.clone().allSuites();

        return _(suites)
            .filter((suite) => _.includes(suite.browsers, this._browserId))
            .map((suite) => this._runSuite(suite, stateProcessor))
            .thru(promiseUtils.waitForResults)
            .value();
    }

    cancel() {
        this._suiteRunners.forEach((runner) => runner.cancel());
    }

    _runSuite(suite, stateProcessor) {
        const browserAgent = BrowserAgent.create(this._browserId, this._browserPool);
        const runner = SuiteRunner.create(suite, browserAgent, this._config);

        this.passthroughEvent(runner, [
            Events.BEGIN_SUITE,
            Events.END_SUITE,
            Events.SKIP_STATE,
            Events.BEGIN_STATE,
            Events.END_STATE,
            Events.TEST_RESULT,
            Events.CAPTURE,
            Events.UPDATE_RESULT,
            Events.WARNING,
            Events.ERROR,
            Events.RETRY
        ]);

        this._suiteRunners.push(runner);
        return runner.run(stateProcessor);
    }
};
