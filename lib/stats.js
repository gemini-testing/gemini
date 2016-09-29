'use strict';

const _ = require('lodash');

const Events = require('./constants/events');

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
            .on(Events.BEGIN_STATE, _.partial(add, 'total'))
            .on(Events.SKIP_STATE, () => {
                add('total');
                add('skipped');
            })
            .on(Events.WARNING, _.partial(add, 'warned'))
            .on(Events.ERROR, _.partial(add, 'errored'))

            .on(Events.UPDATE_RESULT, (res) => {
                add(res && res.updated ? 'updated' : 'passed');
            })
            .on(Events.TEST_RESULT, (res) => {
                add(res && res.equal ? 'passed' : 'failed');
            });
    }

    this.add = add;

    this.get = (name) => name === undefined ? data : data[name];
};
