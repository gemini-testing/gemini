'use strict';

var q = require('bluebird-q'),
    SuiteRunner = require('./suite-runner'),
    inherit = require('inherit');

var StatelessSuiteRunner = inherit(SuiteRunner, {
    _doRun: function() {
        return q.resolve();
    }
});

module.exports = StatelessSuiteRunner;
