'use strict';

const _ = require('lodash');
const lib = require('./lib');
const TestCounter = require('../../test-counter');

const NO_STATE = 'NO_STATE';

module.exports = class ViewModel {
    constructor() {
        this._tree = {name: 'root'};
        this._skips = [];
        this._counter = new TestCounter();
    }

    /**
     * @param {StateResult} result
     */
    addSkipped(result) {
        this._addTestResult(result, {
            skipped: true,
            reason: result.suite.skipComment
        });

        const comment = result.suite.skipComment
            && result.suite.skipComment.replace(/https?:\/\/[^\s]*/g, (url) => {
                return `<a target="_blank" href="${url}">${url}</a>`;
            });
        this._skips.push({suite: result.suite.fullName, browser: result.browserId, comment});

        this._counter.onSkipped(result);
    }

    /**
     * @param {TestStateResult} result
     */
    addSuccess(result) {
        this._addTestResult(result, {
            success: true,
            actualPath: lib.currentPath(result),
            expectedPath: lib.referencePath(result)
        });

        this._counter.onPassed(result);
    }

    /**
     * @param {TestStateResult} result
     */
    addFail(result) {
        this._addTestResult(result, {
            fail: true,
            actualPath: lib.currentPath(result),
            expectedPath: lib.referencePath(result),
            diffPath: lib.diffPath(result)
        });

        this._counter.onFailed(result);
    }

    /**
     * @param {ErrorStateResult} result
     */
    addError(result) {
        this._addTestResult(result, {
            actualPath: result.state ? lib.currentPath(result) : '',
            error: true,
            image: !!result.imagePath || !!result.currentPath,
            reason: (result.stack || result.message || result || '')
        });

        this._counter.onFailed(result);
    }

    /**
     * @param {WarningStateResult} result
     */
    addWarning(result) {
        this._addTestResult(result, {
            warning: true,
            actualPath: lib.currentPath(result),
            reason: (result.message || '')
        });

        this._counter.onSkipped(result);
    }

    /**
     * @param {ErrorStateResult|TestStateResult} result
     */
    addRetry(result) {
        if (result.hasOwnProperty('equal')) {
            this.addFail(result);
        } else {
            this.addError(result);
        }

        this._counter.onRetry(result);
    }

    /**
     * @returns {ViewModelResult}
     */
    getResult() {
        return _.extend(this._counter.getResult(), {
            skips: _.uniq(this._skips, JSON.stringify),
            suites: this._tree.children
        });
    }

    _addTestResult(result, props) {
        const metaInfo = result.suite ? result.suite.metaInfo : {};
        metaInfo.sessionId = result.sessionId || 'unknown session id';

        const testResult = _.assign({
            name: result.browserId,
            metaInfo: JSON.stringify(metaInfo, null, 4) || 'Meta info is not available'
        }, props);
        const node = findOrCreate(this._tree, result.suite.path.concat(result.state ? result.state.name : NO_STATE));

        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];

        const existing = _.findIndex(node.browsers, {name: testResult.name});

        if (existing === -1) {
            node.browsers.push({name: testResult.name, result: testResult, retries: []});
            return;
        }

        const stateInBrowser = node.browsers[existing];
        const previousResult = stateInBrowser.result;

        if (!previousResult.skipped) {
            stateInBrowser.retries.push(previousResult);
        }

        stateInBrowser.result = testResult;
    }

    static hasFails(node) {
        return walk(node, ViewModel.hasFails, node.result && (node.result.error || node.result.fail));
    }

    static hasWarnings(node) {
        return walk(node, ViewModel.hasWarnings, node.result && node.result.warning);
    }

    static hasRetries(node) {
        return walk(node, ViewModel.hasRetries, node.retries && node.retries.length);
    }
};

function walk(node, cb, condition) {
    return ['children', 'browsers'].reduce(function(result, prop) {
        const collection = node[prop];
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

    const pathPart = statePath.shift();

    if (pathPart === NO_STATE) {
        return node;
    }

    let child = _.find(node.children, {name: pathPart});

    if (!child) {
        child = {name: pathPart};
        node.children.push(child);
    }

    return findOrCreate(child, statePath);
}
