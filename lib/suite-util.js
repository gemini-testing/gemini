'use strict';

exports.shouldSkip = function(suite, browserId) {
    var skipped = suite.skipped;

    if (typeof skipped === 'boolean') {
        return skipped;
    }

    return skipped.some(function(browserSkipMatcher) {
        if (browserSkipMatcher.matches(browserId)) {
            suite.skipComment = browserSkipMatcher.comment;
            return true;
        } else {
            return false;
        }
    });
};

exports.isDisabled = function(suite, browserId, state) {
    return !!suite.isDisabled && suite.isDisabled(browserId, state);
};
