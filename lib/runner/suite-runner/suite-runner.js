'use strict';

var _ = require('lodash'),
    q = require('q'),
    inherit = require('inherit'),
    Runner = require('../runner'),
    RunnerEvents = require('../../constants/runner-events');

var SuiteRunner = inherit(Runner, {
    __constructor: function(suite, browserAgent) {
        this._suite = suite;
        this._browserAgent = browserAgent;
    },

    run: function() {
        var _this = this,
            eventData = {
                suite: this._suite,
                browserId: this._browserAgent.browserId
            };

        this.emit(RunnerEvents.BEGIN_SUITE, eventData);
        return this._doRun()
            .fin(function() {
                _this.emit(RunnerEvents.END_SUITE, eventData);
            });
    },

    _doRun: function() {
        throw new Error('Not implemented');
    },

    _doNothing: function() {
        return q.resolve();
    },

    cancel: _.noop
});

module.exports = SuiteRunner;
