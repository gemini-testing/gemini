'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
    lib = require('./lib'),
    TestCounter = require('../utils/test-counter');

var NO_STATE = 'NO_STATE';

module.exports = inherit({
    /**
     * @constructor
     */
    __constructor: function() {
        this._tree = {name: 'root'};
        this._skips = [];
        this._counter = new TestCounter();
    },

    /**
     * @param {StateResult} result
     */
    addSkipped: function(result) {
        this._addTestResult(result, {
            skipped: true,
            reason: result.suite.skipComment
        });

        var comment = result.suite.skipComment
            && result.suite.skipComment.replace(/https?:\/\/[^\s]*/g, function(url) {
                return '<a target="_blank" href="' + url + '">' + url + '</a>';
            });
        this._skips.push({suite: result.suite.fullName, browser: result.browserId, comment: comment});

        this._counter.onSkipped(result);
    },

    /**
     * @param {TestStateResult} result
     */
    addSuccess: function(result) {
        this._addTestResult(result, {
            success: true,
            actualPath: lib.currentPath(result),
            expectedPath: lib.referencePath(result)
        });

        this._counter.onPassed(result);
    },

    /**
     * @param {TestStateResult} result
     */
    addFail: function(result) {
        this._addTestResult(result, {
            fail: true,
            actualPath: lib.currentPath(result),
            expectedPath: lib.referencePath(result),
            diffPath: lib.diffPath(result)
        });

        this._counter.onFailed(result);
    },

    /**
     * @param {ErrorStateResult} result
     */
    addError: function(result) {
        this._addTestResult(result, {
            actualPath: result.state ? lib.currentPath(result) : '',
            error: true,
            image: !!result.imagePath || !!result.currentPath,
            reason: (result.stack || result.message || result || '')
        });

        this._counter.onFailed(result);
    },

    /**
     * @param {WarningStateResult} result
     */
    addWarning: function(result) {
        this._addTestResult(result, {
            warning: true,
            actualPath: lib.currentPath(result),
            reason: (result.message || '')
        });

        this._counter.onSkipped(result);
    },

    /**
     * @param {ErrorStateResult|TestStateResult} result
     */
    addRetry: function(result) {
        if (result.hasOwnProperty('equal')) {
            this.addFail(result);
        } else {
            this.addError(result);
        }

        this._counter.onRetry(result);
    },

    /**
     * @returns {ViewModelResult}
     */
    getResult: function() {
        return _.extend(this._counter.getResult(), {
            skips: _.uniq(this._skips, JSON.stringify),
            suites: this._tree.children
        });
    },

    _addTestResult: function(result, props) {
        var metaInfo = result.suite ? result.suite.metaInfo : {};
        metaInfo.sessionId = result.sessionId || 'unknown session id';

        var testResult = _.assign({
                name: result.browserId,
                metaInfo: JSON.stringify(metaInfo, null, 4) || 'Meta info is not available'
            }, props),
            node = findOrCreate(this._tree, result.suite.path.concat(result.state ? result.state.name : NO_STATE));

        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];

        var existing = _.findIndex(node.browsers, {name: testResult.name});

        if (existing === -1) {
            node.browsers.push({name: testResult.name, result: testResult, retries: []});
            return;
        }

        var stateInBrowser = node.browsers[existing],
            retry = stateInBrowser.result;

        // Hack to avoid situations when `testResult` event is emitted several times for a state, for example,
        // when a state passed, but was retried because of a failure of another state in this suite
        if (retry.success && testResult.success) {
            return;
        }

        stateInBrowser.retries.push(retry);
        stateInBrowser.result = testResult;
    }
}, {
    hasFails: function hasFails(node) {
        return walk(node, hasFails, node.result && (node.result.error || node.result.fail));
    },

    hasWarnings: function hasWarnings(node) {
        return walk(node, hasWarnings, node.result && node.result.warning);
    },

    hasRetries: function hasRetries(node) {
        return walk(node, hasRetries, node.retries && node.retries.length);
    }
});

function walk(node, cb, condition) {
    return ['children', 'browsers'].reduce(function(result, prop) {
        var collection = node[prop];
        return result || Array.isArray(collection) && collection.some(cb);
    }, condition);
}

/**
 * @param {Object} node
 * @param {Array} statePath
 * @returns {Object}
 */
function findOrCreate(node, statePath) {
    if (statePath.length === 0) {
        return node;
    }

    node.children = Array.isArray(node.children) ? node.children : [];

    var pathPart = statePath.shift();

    if (pathPart === NO_STATE) {
        return node;
    }

    var child = _.find(node.children, {name: pathPart});

    if (!child) {
        child = {name: pathPart};
        node.children.push(child);
    }

    return findOrCreate(child, statePath);
}
