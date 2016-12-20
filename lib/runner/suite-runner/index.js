'use strict';

const InsistentSuiteRunner = require('./insistent-suite-runner');
const SkippedSuiteRunner = require('./skipped-suite-runner');
const StatelessSuiteRunner = require('./stateless-suite-runner');
const suiteUtil = require('../../suite-util');

exports.create = function(suite, browserAgent, config) {
    if (!suite.hasStates) {
        return new StatelessSuiteRunner(suite, browserAgent);
    } else if (suiteUtil.shouldSkip(suite, browserAgent.browserId)) {
        return new SkippedSuiteRunner(suite, browserAgent);
    } else {
        return new InsistentSuiteRunner(suite, browserAgent, config);
    }
};
