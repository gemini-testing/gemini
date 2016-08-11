'use strict';

var inherit = require('inherit'),
    suiteUtil = require('./suite-util');

module.exports = inherit({
    __constructor: function(suite, name) {
        this.suite = suite;
        this.name = name;
        this._ownTolerance = null;
        this.actions = [];
        this.browsers = suite.browsers;
    },

    shouldSkip: function(browserId) {
        return suiteUtil.shouldSkip(this.suite, browserId);
    },

    get fullName() {
        return this.suite.fullName + ' ' + this.name;
    },

    get skipped() {
        return this.suite.skipped;
    },

    get captureSelectors() {
        return this.suite.captureSelectors;
    },

    get ignoreSelectors() {
        return this.suite.ignoreSelectors;
    },

    get tolerance() {
        return this._ownTolerance === null ? this.suite.tolerance : this._ownTolerance;
    },

    set tolerance(value) {
        this._ownTolerance = value;
    }
});
