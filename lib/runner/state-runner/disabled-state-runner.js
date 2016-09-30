'use strict';

const Promise = require('bluebird');
const StateRunner = require('./state-runner');

module.exports = class DisabledStateRunner extends StateRunner {
    _capture() {
        return Promise.resolve();
    }
};
