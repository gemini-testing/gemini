'use strict';

var q = require('q'),
    inherit = require('inherit'),
    SuiteRunner = require('./suite-runner'),
    RunnerEvents = require('../../constants/runner-events');

var SkippedSuiteRunner = inherit(SuiteRunner, {
    _doRun: function() {
        this._suite.states.forEach(function(state) {
            this.emit(RunnerEvents.SKIP_STATE, {
                suite: this._suite,
                state: state,
                browserId: this._browserAgent.browserId
            });
        }, this);

        return q.resolve();
    }
});

module.exports = SkippedSuiteRunner;
