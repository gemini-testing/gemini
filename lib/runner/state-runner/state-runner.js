'use strict';

const _ = require('lodash');

const Runner = require('../runner');
const Events = require('../../constants/events');

module.exports = class StateRunner extends Runner {
    constructor(state, browserSession) {
        super();

        this._state = state;
        this._browserSession = browserSession;
        this._stateInfo = {
            suite: state.suite,
            state: state,
            browserId: browserSession.browser.id,
            sessionId: browserSession.browser.sessionId
        };
    }

    run(stateProcessor) {
        this._emit(Events.BEGIN_STATE);

        const session = this._browserSession;

        return session.runActions(this._state.actions)
            .then(() => session.prepareScreenshot(this._state))
            .catch((e) => session.extendWithPageScreenshot(e).thenThrow(e))
            .then((page) => this._capture(stateProcessor, page))
            .catch((e) => this._emit(Events.ERROR, e))
            .finally(() => this._emit(Events.END_STATE));
    }

    _emit(event, data) {
        this.emit(event, _.extend(data || {}, this._stateInfo));
    }

    _capture(stateProcessor, page) {
        console.log('<<<<<<');
	console.log(this._state.suite.name);
        console.log(page);
        return stateProcessor.exec(this._state, this._browserSession, page, this._emit.bind(this));
    }
};
