'use strict';

var RegularSuiteRunner = require('./regular-suite-runner'),
    SkippedSuiteRunner = require('./skipped-suite-runner'),
    StatelessSuiteRunner = require('./stateless-suite-runner'),
    suiteUtil = require('../../suite-util');

exports.create = function(suite, browserAgent, config) {
    if (!suite.hasStates) {
        return new StatelessSuiteRunner(suite, browserAgent);
    }

    if (suiteUtil.shouldSkip(suite, browserAgent.browserId)) {
        return new SkippedSuiteRunner(suite, browserAgent);
    }

    return new RegularSuiteRunner(suite, browserAgent, config);
};
