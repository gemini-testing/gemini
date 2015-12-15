'use strict';

var q = require('q'),
    inherit = require('inherit'),
    SuiteRunner = require('./suite-runner');

var DisabledSuiteRunner = inherit(SuiteRunner, {
    run: function() {
        return q.resolve();
    }
});

module.exports = DisabledSuiteRunner;
