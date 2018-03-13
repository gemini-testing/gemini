'use strict';

const _ = require('lodash');
const url = require('url');
const path = require('path');
const {BrowserAgent, promiseUtils} = require('gemini-core');
const Runner = require('../runner');
const SuiteRunner = require('../suite-runner');
const Events = require('../../constants/events');

module.exports = class BrowserRunner extends Runner {
    constructor(browserId, config, browserPool) {
        super();

        this._browserId = browserId;
        this._config = config.forBrowser(browserId);
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
            .map((suite) => {
                if (suite.hasOwnProperty('url')) {
                    Object.defineProperty(suite, 'fullUrl', {
                        enumerable: true,
                        get: () => this._mkFullUrl(suite.url)
                    });
                }

                return this._runSuite(suite, stateProcessor);
            })
            .thru(promiseUtils.waitForResults)
            .value();
    }

    cancel() {
        this._suiteRunners.forEach((runner) => runner.cancel());
    }

    _mkFullUrl(suiteUrl) {
        const rootUrl = this._config.rootUrl;
        const urlObj = url.parse(rootUrl + '/' + suiteUrl);

        return path.resolve(path.normalize(urlObj.path));
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
            Events.UPDATE_RESULT,
            Events.ERROR,
            Events.RETRY
        ]);

        this._suiteRunners.push(runner);
        return runner.run(stateProcessor);
    }
};
