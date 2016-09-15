'use strict';

const _ = require('lodash');
const suiteUtil = require('./suite-util');

module.exports = class State {
    constructor(suite, name) {
        this.suite = suite;
        this.name = name;
        this._ownTolerance = null;
        this.actions = [];
        this.browsers = _.clone(suite.browsers);
    }

    clone() {
        const clonedState = new State(this.suite, this.name);
        ['_ownTolerance', 'actions'].forEach((prop) => {
            clonedState[prop] = _.clone(this[prop]);
        });

        return clonedState;
    }

    shouldSkip(browserId) {
        return suiteUtil.shouldSkip(this.suite, browserId);
    }

    get fullName() {
        return `${this.suite.fullName} ${this.name}`;
    }

    get skipped() {
        return this.suite.skipped;
    }

    get captureSelectors() {
        return this.suite.captureSelectors;
    }

    get ignoreSelectors() {
        return this.suite.ignoreSelectors;
    }

    get tolerance() {
        return this._ownTolerance === null ? this.suite.tolerance : this._ownTolerance;
    }

    set tolerance(value) {
        this._ownTolerance = value;
    }
};
