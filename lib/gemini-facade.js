'use strict';

const _ = require('lodash');
const Runner = require('./runner/runner');
const RunnerEvents = require('./constants/runner-events');

module.exports = class GeminiFacade extends Runner {
    constructor(runner) {
        super();

        this.config = runner.config;
        this.events = RunnerEvents;

        this.passthroughEvent(runner, _.values(RunnerEvents));
    }
};
