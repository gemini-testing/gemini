'use strict';

var q = require('bluebird-q'),
    inherit = require('inherit'),
    SuiteRunner = require('./suite-runner'),
    Events = require('../../constants/events');

var SkippedSuiteRunner = inherit(SuiteRunner, {
    _doRun: function() {
        this._suite.states.forEach(function(state) {
            this.emit(Events.SKIP_STATE, {
                suite: this._suite,
                state: state,
                browserId: this._browserAgent.browserId
            });
        }, this);

        return q.resolve();
    }
});

module.exports = SkippedSuiteRunner;
