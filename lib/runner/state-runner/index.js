'use strict';

var StateRunner = require('./state-runner'),
    DisabledStateRunner = require('./disabled-state-runner'),
    suiteUtil = require('../../suite-util');

exports.create = function(state, browserSession, config) {
    if (suiteUtil.isDisabled(state.suite, state, browserSession.browser.id)) {
        return new DisabledStateRunner(state, browserSession);
    }

    return new StateRunner(state, browserSession, config);
};
