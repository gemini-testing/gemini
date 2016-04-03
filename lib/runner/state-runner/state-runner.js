'use strict';

var inherit = require('inherit'),
    _ = require('lodash'),
    q = require('q'),
    Runner = require('../runner'),

    RunnerEvents = require('../../constants/runner-events'),
    PrivateEvents = require('../private-events'),

    NoRefImageError = require('../../errors/no-ref-image-error'),
    StateError = require('../../errors/state-error');

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

        _this.emit(RunnerEvents.BEGIN_STATE, this._stateInfo);

        return this._browserSession.runActions(this._state.actions)
            .then(function() {
                return _this._capture(stateProcessor);
            }, function(e) {
                return _this._browserSession.handleError(e);
            })
            .fail(function(e) {
                _.extend(e, _this._stateInfo);

                if (e instanceof NoRefImageError || e instanceof StateError) {
                    _this.emit(RunnerEvents.ERROR, e);
                } else {
                    return q.reject(e);
                }
            })
            .fin(function() {
                _this.emit(RunnerEvents.END_STATE, _this._stateInfo);
            });
    },

    _capture: function(stateProcessor) {
        return stateProcessor.exec(this._state, this._browserSession, {coverage: this._config.isCoverageEnabled()})
            .then(function(result) {
                this.emit(PrivateEvents.STATE_RESULT, _.extend(result, this._stateInfo));
            }.bind(this));
    }
});

module.exports = StateRunner;
