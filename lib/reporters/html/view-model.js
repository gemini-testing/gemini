'use strict';

var _ = require('lodash'),
    inherit = require('inherit'),
    lib = require('./lib');

module.exports = inherit({
    /**
     * @constructor
     */
    __constructor: function() {
        this._tree = {name: 'root'};
        this._failed = this._passed = this._skipped = 0;
    },

    /**
     * @param {StateResult} result
     */
    addSkipped: function(result) {
        this._addTestResult(result, {
            name: result.browserId,
            skipped: true
        });

        this._skipped++;
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

        this._passed++;
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

        this._failed++;
    },

    /**
     * @param {ErrorStateResult} result
     */
    addError: function(result) {
        this._addTestResult(result, {
            name: result.browserId,
            error: true,
            reason: (result.stack || result.message || result || '')
        });

        this._failed++;
    },

    /**
     * @param {WarningStateResult} result
     */
    addWarning: function(result) {
        this._addTestResult(result, {
            name: result.browserId,
            warning: true,
            reason: (result.message || '')
        });

        this._skipped++;
    },

    /**
     * @returns {ViewModelResult}
     */
    getResult: function() {
        return {
            suites: this._tree.children,
            total: this._failed + this._passed + this._skipped,
            failed: this._failed,
            passed: this._passed,
            skipped: this._skipped
        };
    },

    _addTestResult: function(result, props) {
        var testResult = _.assign({name: result.browserId}, props),
            node = findOrCreate(this._tree, result.suitePath.concat(result.stateName));

        node.browsers = Array.isArray(node.browsers)? node.browsers : [];
        node.browsers.push(testResult);
    }
}, {
    hasFails: function hasFails(node) {
        return ['children', 'browsers'].reduce(function(result, prop) {
            var collection = node[prop];
            return result || (Array.isArray(collection)? collection.some(hasFails) : false);
        }, node.fail || node.error);
    }
});

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

    var pathPart = statePath.shift(),
        child = _.find(node.children, 'name', pathPart);

    if (!child) {
        child = {name: pathPart};
        node.children.push(child);
    }

    return findOrCreate(child, statePath);
}
