'use strict';

const StateRunner = require('./state-runner');
const DisabledStateRunner = require('./disabled-state-runner');
const _ = require('lodash');

exports.create = (state, browserSession) => {
    if (!_.includes(state.browsers, browserSession.browser.id)) {
        return new DisabledStateRunner(state, browserSession);
    }

    return new StateRunner(state, browserSession);
};
