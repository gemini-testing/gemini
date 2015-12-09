'use strict';

var inherit = require('inherit'),
    _ = require('lodash'),
    q = require('q'),
    Runner = require('./runner'),

    RunnerEvents = require('../constants/runner-events'),
    PrivateEvents = require('./private-events'),

    NoRefImageError = require('../errors/no-ref-image-error'),
    StateError = require('../errors/state-error');

var StateRunner = inherit(Runner, {
    __constructor: function(browserSession, config) {
        this._browserSession = browserSession;
        this._config = config;
    },

    run: function(state) {
        var _this = this,
            suite = state.suite,
            eventData = {
                suite: suite,
                state: state,
                browserId: this._browserSession.browser.id,
                sessionId: this._browserSession.browser.sessionId
            };

        if (state.shouldSkip(this._browserSession.browser)) {
            _this.emit(RunnerEvents.SKIP_STATE, eventData);
            return q();
        }

        _this.emit(RunnerEvents.BEGIN_STATE, eventData);

        return this._browserSession.capture(state, {coverage: this._config.isCoverageEnabled()})
            .then(function(data) {
                return _this.emitAndWait(PrivateEvents.CAPTURE_DATA, _.extend(data, {
                    suite: suite,
                    state: state,
                    browser: _this._browserSession.browser
                }));
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
    }
}, {
    create: function(browserSession, config) {
        return new StateRunner(browserSession, config);
    }
});

module.exports = StateRunner;
