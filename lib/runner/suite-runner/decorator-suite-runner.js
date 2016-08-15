'use strict';

const url = require('url');
const path = require('path');

const Runner = require('../runner');
const RunnerEvents = require('../../constants/runner-events');
const PrivateEvents = require('../private-events');

module.exports = class DecoratorSuiteRunner extends Runner {
    constructor(runner, browserAgent, config) {
        super();

        this._suiteRunner = runner;
        this._browserConfig = config.forBrowser(browserAgent.browserId);

        [
            RunnerEvents.BEGIN_SUITE,
            RunnerEvents.END_SUITE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.SKIP_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.END_TEST,
            RunnerEvents.CAPTURE,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR,
            PrivateEvents.CRITICAL_ERROR
        ].forEach((event) => this._decorateEvent(event));
    }

    run(stateProcessor) {
        return this._suiteRunner.run(stateProcessor);
    }

    cancel() {
        this._suiteRunner.cancel();
    }

    _decorateEvent(event) {
        this._suiteRunner.on(event, (data) => this.emitAndWait(event, this._addMetaUrl(data)));
    }

    _addMetaUrl(data) {
        if (data.suite.metaInfo) {
            return data;
        }

        const metaUrl = this._mkFullUrl(data.suite.url);

        data.suite.metaInfo = {
            get url() {
                return metaUrl;
            }
        };

        return data;
    }

    _mkFullUrl(suiteUrl) {
        const rootUrl = this._browserConfig.rootUrl;
        const urlObj = url.parse(rootUrl + '/' + suiteUrl);

        return path.resolve(path.normalize(urlObj.path));
    }
};
