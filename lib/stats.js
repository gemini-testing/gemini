'use strict';

const _ = require('lodash');

const RunnerEvents = require('./constants/runner-events');

/**
 * @constructor
 * @param {Runner} [runner]
 */
module.exports = function(runner) {
    const data = {};

    const add = (key) => {
        data[key] = data[key] || 0;
        data[key]++;
    };

    if (runner) {
        runner
            .on(RunnerEvents.BEGIN_STATE, _.partial(add, 'total'))
            .on(RunnerEvents.SKIP_STATE, () => {
                add('total');
                add('skipped');
            })
            .on(RunnerEvents.WARNING, _.partial(add, 'warned'))
            .on(RunnerEvents.ERROR, _.partial(add, 'errored'))

            .on(RunnerEvents.UPDATE_RESULT, (res) => {
                add(res && res.updated ? 'updated' : 'passed');
            })
            .on(RunnerEvents.TEST_RESULT, (res) => {
                add(res && res.equal ? 'passed' : 'failed');
            });
    }

    this.add = add;

    this.get = (name) => name === undefined ? data : data[name];
};
