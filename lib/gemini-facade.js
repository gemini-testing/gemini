'use strict';

const _ = require('lodash');
const Runner = require('./runner/runner');
const Events = require('./constants/events');

module.exports = class GeminiFacade extends Runner {
    constructor(runner) {
        super();

        this.config = runner.config;
        this.events = Events;

        this.passthroughEvent(runner, _.values(Events));
    }
};
