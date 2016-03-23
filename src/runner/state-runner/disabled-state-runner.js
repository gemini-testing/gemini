'use strict';

var q = require('q'),
    inherit = require('inherit'),
    StateRunner = require('./state-runner');

var DisabledStateRunner = inherit(StateRunner, {
    _capture: function() {
        return q.resolve();
    }
});

module.exports = DisabledStateRunner;
