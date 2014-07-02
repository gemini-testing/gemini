'use strict';

var inherit = require('inherit');

module.exports = inherit({
    __constructor: function(suite, name, cb) {
        this.suite = suite;
        this.name = name;
        this.callback = cb || function() {};
    },

    shouldSkip: function(browser) {
        if (typeof this.skipped === 'boolean') {
            return this.skipped;
        }

        return this.skipped.some(function(skipBrowser) {
            if (skipBrowser.browserName !== browser.browserName) {
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
