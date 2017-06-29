'use strict';

const InsistentSuiteRunner = require('./insistent-suite-runner');
const SkippedSuiteRunner = require('./skipped-suite-runner');
const StatelessSuiteRunner = require('./stateless-suite-runner');

exports.create = function(suite, browserAgent, config) {
    if (!suite.hasStates) {
        return new StatelessSuiteRunner(suite, browserAgent);
    } else if (suite.shouldSkip(browserAgent.browserId)) {
        return new SkippedSuiteRunner(suite, browserAgent);
    } else {
        return new InsistentSuiteRunner(suite, browserAgent, config);
    }
};
