'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
    Runner = require('../runner'),
    Events = require('../../constants/events');

var SuiteRunner = inherit(Runner, {
    __constructor: function(suite, browserAgent) {
        this._suite = suite;
        this._browserAgent = browserAgent;
    },

    run: function(stateProcessor) {
        var _this = this;

        this._emit(Events.BEGIN_SUITE);
        return this._doRun(stateProcessor)
            .finally(function() {
                _this._emit(Events.END_SUITE);
            });
    },

    _emit: function(event, data) {
        data = data || {};
        this.emit(event, _.extend(data, {
            suite: this._suite,
            browserId: this._browserAgent.browserId
        }));
    },

    _doRun: function() {
        throw new Error('Not implemented');
    },

    cancel: function() {
        this._cancelled = true;

        this.emit = _.noop;
    }
});

module.exports = SuiteRunner;
