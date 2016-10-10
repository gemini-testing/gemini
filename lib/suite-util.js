'use strict';

exports.shouldSkip = (suite, browserId) => {
    const skipped = suite.skipped;

    if (typeof skipped === 'boolean') {
        return skipped;
    }

    return skipped.some((browserSkipMatcher) => {
        if (browserSkipMatcher.matches(browserId)) {
            suite.skipComment = browserSkipMatcher.comment;
            return true;
        }
        return false;
    });
};
