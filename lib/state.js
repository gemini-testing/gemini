'use strict';

var q = require('q'),
    inherit = require('inherit'),
    find = require('./find-func').find,

    StateError = require('./errors/state-error');

module.exports = inherit({
    __constructor: function(suite, name, cb) {
        this.suite = suite;
        this.name = name;
        this._callback = cb;
    },

    activate: function(browser, context) {
        var sequence = browser.createActionSequence();

        try {
            this._callback.call(context, sequence, find);
        } catch(e) {
            return q.reject(new StateError('Error while executing callback', {
                suiteName: this.suite.name,
                stateName: this.name,
                browserName: browser.fullName
            }, e));
        }

        return sequence.perform();
    },

    shouldSkip: function(browser) {
        if (typeof this.skipped === 'boolean') {
            return this.skipped;
        }

        return this.skipped.some(function(skipBrowser) {
            if (skipBrowser.name !== browser.name) {
                return false;
            }

            if (typeof skipBrowser.version !== 'undefined') {
                return skipBrowser.version === browser.version;
            }

            return true;

        });
    },


    get skipped() {
        return this.suite.skipped;
    },
    
    get captureSelectors() {
        return this.suite.captureSelectors;
    }

});
