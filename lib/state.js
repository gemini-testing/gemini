'use strict';

var q = require('q'),
    inherit = require('inherit'),

    StateError = require('./errors/state-error');

module.exports = inherit({
    __constructor: function(suite, name, cb) {
        this.suite = suite;
        this.name = name;
        this._callback = cb;
    },

    activate: function(browser, elements) {
        var sequence = browser.createActionSequence();

        try {
            this._callback.call(null, sequence, elements);
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

    get dynamicElementsSelectors() {
        return this.suite.dynamicElementsSelectors;
    },

    get skipped() {
        return this.suite.skipped;
    }

});
