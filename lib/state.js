'use strict';

var inherit = require('inherit'),
    suiteUtil = require('./suite-util');

module.exports = inherit({
    __constructor: function(suite, name, cb) {
        this.suite = suite;
        this.name = name;
        this._ownTolerance = null;
        this.callback = cb || function() {};
    },

    shouldSkip: function(browser) {
        return suiteUtil.shouldSkip(this.skipped, browser);
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
        return this._ownTolerance === null? this.suite.tolerance : this._ownTolerance;
    },

    set tolerance(value) {
        this._ownTolerance = value;
    }
});
