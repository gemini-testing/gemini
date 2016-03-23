'use strict';
var _ = require('lodash'),

    RunnerEvents = require('./constants/runner-events');

/**
 * @constructor
 * @param {Runner} [runner]
 */
module.exports = function(runner) {
    var data = {};

    function add(key) {
        data[key] = data[key] || 0;
        data[key]++;
    }

    if (runner) {
        runner
            .on(RunnerEvents.BEGIN_STATE, _.partial(add, 'total'))
            .on(RunnerEvents.SKIP_STATE, function() {
                add('total');
                add('skipped');
            })
            .on(RunnerEvents.WARNING, _.partial(add, 'warned'))
            .on(RunnerEvents.ERROR, _.partial(add, 'errored'))

            .on(RunnerEvents.CAPTURE, _.partial(add, 'gathered'))
            .on(RunnerEvents.END_TEST, function(res) {
                add(res && res.equal? 'passed' : 'failed');
            });
    }

    this.add = add;

    this.get = function(name) {
        return name === undefined? data : data[name];
    };
};
