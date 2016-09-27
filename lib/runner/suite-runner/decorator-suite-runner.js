'use strict';

const url = require('url');
const path = require('path');

const Runner = require('../runner');
const Events = require('../../constants/events');

module.exports = class DecoratorSuiteRunner extends Runner {
    constructor(runner, browserAgent, config) {
        super();

        this._suiteRunner = runner;
        this._browserConfig = config.forBrowser(browserAgent.browserId);

        this.passthroughEvent(this._suiteRunner, [
            Events.BEGIN_SUITE,
            Events.END_SUITE
        ]);

        [
            Events.BEGIN_STATE,
            Events.SKIP_STATE,
            Events.END_STATE,
            Events.TEST_RESULT,
            Events.CAPTURE,
            Events.UPDATE_RESULT,
            Events.WARNING,
            Events.ERROR,
            Events.RETRY
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
