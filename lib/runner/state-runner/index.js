'use strict';

var StateRunner = require('./state-runner'),
    DisabledStateRunner = require('./disabled-state-runner'),
    _ = require('lodash');

exports.create = function(state, browserSession, config) {
    if (!_.contains(state.browsers, browserSession.browser.id)) {
        return new DisabledStateRunner(state, browserSession, config);
    }

    return new StateRunner(state, browserSession, config);
};
