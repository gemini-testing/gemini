'use strict';

var path = require('path'),

    Promise = require('bluebird'),
    fs = require('q-io/fs'),

    view = require('./view'),
    ViewModel = require('./view-model'),
    lib = require('./lib'),
    chalk = require('chalk'),
    logger = require('../../utils').logger,

    Events = require('../../constants/events');

/**
 * @param {String} srcPath
 * @param {String} destPath
 * @returns {Q}
 */
function copyImage(srcPath, destPath) {
    return makeDirFor(destPath)
        .then(fs.copy.bind(fs, srcPath, destPath));
}

/**
 * @param {TestStateResult} result
 * @param {String} destPath
 * @returns {Q}
 */
function saveDiff(result, destPath) {
    return makeDirFor(destPath)
        .then(result.saveDiffTo.bind(result, destPath));
}

/**
 * @param {String} destPath
 */
function makeDirFor(destPath) {
    return fs.makeTree(path.dirname(destPath));
}

function prepareViewData(runner) {
    return new Promise((resolve) => {
        var model = new ViewModel();

        runner.on(Events.SKIP_STATE, model.addSkipped.bind(model));

        runner.on(Events.TEST_RESULT, function(r) {
            if (r.equal) {
                model.addSuccess(r);
            } else {
                model.addFail(r);
            }
        });

        runner.on(Events.RETRY, model.addRetry.bind(model));

        runner.on(Events.ERROR, model.addError.bind(model));
        runner.on(Events.WARNING, model.addWarning.bind(model));

        runner.on(Events.END, function() {
            resolve(model.getResult());
        });
    });
}

function logError(e) {
    console.error(e.stack);
}

function logPathToHtmlReport() {
    const reportPath = `file://${path.resolve('gemini-report/index.html')}`;

    logger.log(`Your HTML report is here: ${chalk.yellow(reportPath)}`);
}

function prepareImages(runner) {
    function handleTestResultEvent_(testResult) {
        return Promise.all([
            copyImage(testResult.currentPath, lib.currentAbsolutePath(testResult)),
            copyImage(testResult.referencePath, lib.referenceAbsolutePath(testResult)),
            testResult.equal || saveDiff(testResult, lib.diffAbsolutePath(testResult))
        ]);
    }

    function handleErrorEvent_(testResult) {
        var src = testResult.imagePath || testResult.currentPath;

        return src && copyImage(src, lib.currentAbsolutePath(testResult));
    }

    return new Promise((resolve, reject) => {
        let queue = Promise.resolve(true);

        runner.on(Events.WARNING, function(testResult) {
            queue = queue.then(function() {
                return copyImage(testResult.currentPath, lib.currentAbsolutePath(testResult));
            });
        });

        runner.on(Events.ERROR, function(testResult) {
            queue = queue.then(function() {
                return handleErrorEvent_(testResult);
            });
        });

        runner.on(Events.RETRY, function(testResult) {
            queue = queue.then(function() {
                return testResult.hasOwnProperty('equal')
                    ? handleTestResultEvent_(testResult)
                    : handleErrorEvent_(testResult);
            });
        });

        runner.on(Events.TEST_RESULT, function(testResult) {
            queue = queue.then(function() {
                return handleTestResultEvent_(testResult);
            });
        });

        runner.on(Events.END, function() {
            logPathToHtmlReport();

            queue.then(resolve, reject);
        });
    });
}

module.exports = function htmlReporter(tester) {
    Promise.all([
        prepareViewData(tester),
        prepareImages(tester)
    ])
        .spread(view.createHtml)
        .then(view.save)
        .catch(logError)
        .done();
};
