'use strict';

const _ = require('lodash');
const QEmitter = require('qemitter');
const passthroughEvent = require('qemitter/utils').passthroughEvent;
const RunnerEvents = require('./constants/runner-events');

module.exports = class GeminiFacade extends QEmitter {
    constructor(runner) {
        super();

        this.config = runner.config;
        this.events = RunnerEvents;

        passthroughEvent(runner, this, _.values(RunnerEvents));
    }
};
