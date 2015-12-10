'use strict';

var RegularSuiteRunner = require('./regular-suite-runner'),
    StatelessSuiteRunner = require('./stateless-suite-runner');

exports.create = function(suite, browserAgent, config) {
    if (!suite.hasStates) {
        return new StatelessSuiteRunner(suite, browserAgent);
    }

    return new RegularSuiteRunner(suite, browserAgent, config);
};
