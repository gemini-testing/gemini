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
    },

    run: function() {
        var _this = this,
            eventData = {
                suite: this._state.suite,
                state: this._state,
                browserId: this._browserSession.browser.id,
                sessionId: this._browserSession.browser.sessionId
            };

        _this.emit(RunnerEvents.BEGIN_STATE, eventData);

        return this._browserSession.runActions(this._state.actions)
            .then(function() {
                return _this._capture();
            }, function(e) {
                return _this._browserSession.handleError(e);
            })
            .fail(function(e) {
                _.extend(e, eventData);

                if (e instanceof NoRefImageError || e instanceof StateError) {
                    _this.emit(RunnerEvents.ERROR, e);
                } else {
                    return q.reject(e);
                }
            })
            .fin(function() {
                _this.emit(RunnerEvents.END_STATE, eventData);
            });
    },

    _capture: function() {
        var _this = this;
        return this._browserSession.capture(this._state, {coverage: _this._config.isCoverageEnabled()})
            .then(function(data) {
                return _this.emitAndWait(PrivateEvents.CAPTURE_DATA, _.extend(data, {
                    suite: _this._state.suite,
                    state: _this._state,
                    browser: _this._browserSession.browser
                }));
            });
    }
});

module.exports = StateRunner;
