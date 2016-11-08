'use strict';
var EventEmitter = require('events').EventEmitter,

    _ = require('lodash'),
    inherit = require('inherit'),

    Events = require('./constants/events');

const SuiteMonitor = module.exports = inherit(EventEmitter, {

    __constructor: function() {
        this.awaiting = {};
        this.complete = new WeakMap();
    },

    suiteFinished: function(suite, browser) {
        if (suite.children.length === 0) {
            this._markAsCompleted(suite, browser);
            this.emit(Events.END_SUITE, {suite: suite, browserId: browser});
        } else {
            if (!this.awaiting[browser]) {
                this.awaiting[browser] = [];
            }
            this.awaiting[browser].push(suite);
        }

        this._processAwaitingSuites(browser);
    },

    _processAwaitingSuites: function(browser) {
        var suites = this.awaiting[browser],
            complete = [];

        if (!suites) {
            return;
        }

        _.forEachRight(suites, function(suite, i) {
            if (_.every(suite.children, this._isCompletedInBrowser.bind(this, browser))) {
                this._markAsCompleted(suite, browser);
                this.emit(Events.END_SUITE, {suite: suite, browserId: browser});
                complete.push(i);
            }
        }.bind(this));

        _.pullAt(suites, complete);
    },

    _markAsCompleted: function(suite, browser) {
        var browsers = this.complete.get(suite) || {};
        browsers[browser] = true;
        this.complete.set(suite, browsers);
    },

    _isCompletedInBrowser: function(browser, suite) {
        return this.complete.has(suite) && this.complete.get(suite)[browser];
    }

}, {
    create: function() {
        return new SuiteMonitor();
    }
});
