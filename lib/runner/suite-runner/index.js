'use strict';

var RegularSuiteRunner = require('./regular-suite-runner');

exports.create = function(suite, browserAgent, config) {
    return new RegularSuiteRunner(suite, browserAgent, config);
};
