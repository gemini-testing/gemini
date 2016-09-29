'use strict';

const q = require('bluebird-q');
const StateRunner = require('./state-runner');

module.exports = class DisabledStateRunner extends StateRunner {
    _capture() {
        return q.resolve();
    }
};
