'use strict';

var Promise = require('bluebird'),
    SuiteRunner = require('./suite-runner'),
    inherit = require('inherit');

var StatelessSuiteRunner = inherit(SuiteRunner, {
    _doRun: function() {
        return Promise.resolve();
    }
});

module.exports = StatelessSuiteRunner;
