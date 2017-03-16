'use strict';

const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const Promise = require('bluebird');

const lib = require('./lib');
const view = require('./view');
const ViewModel = require('./view-model');
const logger = require('../../utils').logger;
const Events = require('../../constants/events');

/**
 * @param {String} srcPath
 * @param {String} destPath
 * @returns {Q}
 */
function copyImage(srcPath, destPath) {
    return makeDirFor(destPath)
        .then(() => fs.copyAsync(srcPath, destPath));
}

/**
 * @param {TestStateResult} result
 * @param {String} destPath
 * @returns {Q}
 */
function saveDiff(result, destPath) {
    return makeDirFor(destPath)
        .then(() => result.saveDiffTo(destPath));
}

/**
 * @param {String} destPath
 */
function makeDirFor(destPath) {
    return fs.mkdirsAsync(path.dirname(destPath));
}

function prepareViewData(runner, reportOptions) {
    return new Promise((resolve) => {
        var model = new ViewModel(runner.config, reportOptions);

        runner.on(Events.SKIP_STATE, model.addSkipped.bind(model));

        runner.on(Events.TEST_RESULT, (result) => {
            result.equal ? model.addSuccess(result) : model.addFail(result);
        });

        runner.on(Events.RETRY, model.addRetry.bind(model));

        runner.on(Events.ERROR, model.addError.bind(model));
        runner.on(Events.WARNING, model.addWarning.bind(model));

        runner.on(Events.END, () => {
            resolve(model.getResult());
        });
    });
}

function logError(e) {
    console.error(e.stack);
}

function logPathToHtmlReport(reporterPath) {
    const reportPath = `file://${path.resolve((reporterPath || lib.REPORT_DIR) + '/index.html')}`;

    logger.log(`Your HTML report is here: ${chalk.yellow(reportPath)}`);
}

function prepareImages(runner, reportOptions) {
    function handleTestResultEvent_(testResult) {
        let actions = [];

        if (!reportOptions.failedOnly) {
            actions.push(
                copyImage(testResult.referencePath, lib.referenceAbsolutePath(testResult))
            );
        }

        if (!testResult.equal) {
            actions.push(
                copyImage(testResult.currentPath, lib.currentAbsolutePath(testResult)),
                saveDiff(testResult, lib.diffAbsolutePath(testResult))
            );
        }

        return Promise.all(actions);
    }

    function handleErrorEvent_(testResult) {
        var src = testResult.imagePath || testResult.currentPath;

        return src && copyImage(src, lib.currentAbsolutePath(testResult));
    }

    return new Promise((resolve, reject) => {
        let queue = Promise.resolve(true);

        runner.on(Events.WARNING, (testResult) => {
            queue = queue.then(() => {
                return copyImage(testResult.currentPath, lib.currentAbsolutePath(testResult));
            });
        });

        runner.on(Events.ERROR, (testResult) => {
            queue = queue.then(() => handleErrorEvent_(testResult));
        });

        runner.on(Events.RETRY, (testResult) => {
            queue = queue.then(() => {
                return testResult.hasOwnProperty('equal')
                    ? handleTestResultEvent_(testResult)
                    : handleErrorEvent_(testResult);
            });
        });

        runner.on(Events.TEST_RESULT, function(testResult) {
            queue = queue.then(() => handleTestResultEvent_(testResult));
        });

        runner.on(Events.END, () => {
            queue.then(resolve, reject);
        });
    });
}

module.exports = function htmlReporter(runner, reportPath, reportOptions) {
    reportOptions = reportOptions || {};
    const generateReportPromise = Promise.all([prepareViewData(runner, reportOptions), prepareImages(runner, reportOptions)])
        .spread(view.createHtml)
        .then((html) => view.save(html, reportPath))
        .then(() => logPathToHtmlReport(reportPath))
        .catch(logError);

    runner.on(Events.END_RUNNER, () => generateReportPromise.thenReturn());
};
