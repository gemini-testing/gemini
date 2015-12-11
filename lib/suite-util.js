'use strict';

var _ = require('lodash');

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

exports.flattenSuites = function flat(suiteNode) {
    if (!suiteNode) {
        return [];
    }

    return _.reduce(suiteNode.children, function(result, suite) {
        return result.concat(flat(suite));
    }, [suiteNode]);
};
