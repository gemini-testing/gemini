'use strict';

var inherit = require('inherit'),
    _ = require('lodash'),
    Runner = require('../runner'),

    RunnerEvents = require('../../constants/runner-events');

var StateRunner = inherit(Runner, {
    __constructor: function(state, browserSession, config) {
        this._state = state;
        this._browserSession = browserSession;
        this._config = config;
        this._stateInfo = {
            suite: state.suite,
            state: state,
            browserId: browserSession.browser.id,
            sessionId: browserSession.browser.sessionId
        };
    },

    run: function(stateProcessor) {
        var _this = this;

        this._emit(RunnerEvents.BEGIN_STATE);

        var session = this._browserSession;

        return session.runActions(this._state.actions)
            .then(function() {
                return session.prepareScreenshot(_this._state, {coverage: _this._config.isCoverageEnabled()});
            })
            .fail(function(e) {
                return session.extendWithPageScreenshot(e)
                    .thenReject(e);
            })
            .then(function(page) {
                return _this._capture(stateProcessor, page);
            })
            .fail(function(e) {
                return _this._emit(RunnerEvents.ERROR, e);
            })
            .fin(function() {
                _this._emit(RunnerEvents.END_STATE);
            });
    },

    _emit: function(event, data) {
        this.emit(event, _.extend(data || {}, this._stateInfo));
    },

    _capture: function(stateProcessor, page) {
        return stateProcessor.exec(this._state, this._browserSession, page, this._emit.bind(this));
    }
});

module.exports = StateRunner;
