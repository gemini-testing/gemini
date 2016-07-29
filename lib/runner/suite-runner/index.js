'use strict';

const RegularSuiteRunner = require('./regular-suite-runner');
const SkippedSuiteRunner = require('./skipped-suite-runner');
const StatelessSuiteRunner = require('./stateless-suite-runner');
const DecoratorSuiteRunner = require('./decorator-suite-runner');
const suiteUtil = require('../../suite-util');

exports.create = function(suite, browserAgent, config) {
    let suiteRunner;

    if (!suite.hasStates) {
        suiteRunner = new StatelessSuiteRunner(suite, browserAgent);
    } else if (suiteUtil.shouldSkip(suite, browserAgent.browserId)) {
        suiteRunner = new SkippedSuiteRunner(suite, browserAgent);
    } else {
        suiteRunner = new RegularSuiteRunner(suite, browserAgent, config);
    }

    return new DecoratorSuiteRunner(suiteRunner, browserAgent, config);
};
