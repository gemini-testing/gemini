'use strict';

exports.shouldSkip = function(skipped, browser) {
    if (typeof skipped === 'boolean') {
        return skipped;
    }

    return skipped.some(function(skipBrowser) {
        if (skipBrowser === browser.browserName) {
            return true;
        }

        if (skipBrowser.browserName !== browser.browserName) {
            return false;
        }

        if (typeof skipBrowser.version !== 'undefined') {
            return skipBrowser.version === browser.version;
        }

        return true;
    });
};
