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
        this._counter = new TestCounter();
    },

    /**
     * @param {StateResult} result
     */
    addSkipped: function(result) {
        this._addTestResult(result, {
            name: result.browserId,
            skipped: true
        });

        this._counter.onSkipped(result);
    },

    /**
     * @param {TestStateResult} result
     */
    addSuccess: function(result) {
        this._addTestResult(result, {
            name: result.browserId,
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
            name: result.browserId,
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
            name: result.browserId,
            actualPath: result.state? lib.currentPath(result) : '',
            error: true,
            image: !!result.image,
            reason: (result.stack || result.message || result || '')
        });

        this._counter.onFailed(result);
    },

    /**
     * @param {WarningStateResult} result
     */
    addWarning: function(result) {
        this._addTestResult(result, {
            name: result.browserId,
            warning: true,
            actualPath: lib.currentPath(result),
            reason: (result.message || '')
        });

        this._counter.onSkipped(result);
    },

    /**
     * @returns {ViewModelResult}
     */
    getResult: function() {
        return _.extend(this._counter.getResult(), {
            suites: this._tree.children
        });
    },

    _addTestResult: function(result, props) {
        var testResult = _.assign({name: result.browserId}, props),
            node = findOrCreate(this._tree, result.suite.path.concat(result.state? result.state.name : NO_STATE));

        node.browsers = Array.isArray(node.browsers)? node.browsers : [];
        node.browsers.push(testResult);
    }
}, {
    hasFails: function hasFails(node) {
        return walk(node, hasFails, node.fail || node.error);
    },
    hasWarnings: function hasWarnings(node) {
        return walk(node, hasWarnings, node.warning);
    }
});

function walk(node, cb, condition) {
    return ['children', 'browsers'].reduce(function(result, prop) {
        var collection = node[prop];
        return result || Array.isArray(collection) && collection.some(cb);
    }, condition);
}
/**
 *
 * @param {Object} node
 * @param {Array} statePath
 * @returns {Object}
 */
function findOrCreate(node, statePath) {
    if (statePath.length === 0) {
        return node;
    }

    node.children = Array.isArray(node.children)? node.children : [];

    var pathPart = statePath.shift();

    if (pathPart === NO_STATE) {
        return node;
    }

    var child = _.find(node.children, 'name', pathPart);

    if (!child) {
        child = {name: pathPart};
        node.children.push(child);
    }

    return findOrCreate(child, statePath);
}
