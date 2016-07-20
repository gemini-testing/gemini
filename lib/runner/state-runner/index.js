'use strict';

const StateRunner = require('./state-runner');
const DisabledStateRunner = require('./disabled-state-runner');
const _ = require('lodash');

exports.create = (state, browserSession, config) => {
    if (!_.contains(state.browsers, browserSession.browser.id)) {
        return new DisabledStateRunner(state, browserSession, config);
    }

    return new StateRunner(state, browserSession, config);
};
