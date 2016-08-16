'use strict';

const _ = require('lodash');

const Runner = require('../runner');
const RunnerEvents = require('../../constants/runner-events');

module.exports = class StateRunner extends Runner {
    constructor(state, browserSession, config) {
        super();

        this._state = state;
        this._browserSession = browserSession;
        this._config = config;
        this._stateInfo = {
            suite: state.suite,
            state: state,
            browserId: browserSession.browser.id,
            sessionId: browserSession.browser.sessionId
        };
    }

    run(stateProcessor) {
        this._emit(RunnerEvents.BEGIN_STATE);

        const session = this._browserSession;

        return session.runActions(this._state.actions)
            .then(() => session.prepareScreenshot(this._state,
                {coverage: this._config.isCoverageEnabled()}))
            .fail((e) => session.extendWithPageScreenshot(e)
                .thenReject(e))
            .then((page) => this._capture(stateProcessor, page))
            .fail((e) => this._emit(RunnerEvents.ERROR, e))
            .fin(() => this._emit(RunnerEvents.END_STATE));
    }

    _emit(event, data) {
        this.emit(event, _.extend(data || {}, this._stateInfo));
    }

    _capture(stateProcessor, page) {
        return stateProcessor.exec(this._state, this._browserSession, page, this._emit.bind(this));
    }
};
