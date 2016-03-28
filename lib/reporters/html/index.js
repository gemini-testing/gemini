'use strict';

var path = require('path'),

    q = require('q'),
    fs = require('q-io/fs'),

    view = require('./view'),
    ViewModel = require('./view-model'),
    lib = require('./lib'),

    RunnerEvents = require('../../constants/runner-events');

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
    var result = q.defer(),
        model = new ViewModel();

    runner.on(RunnerEvents.SKIP_STATE, model.addSkipped.bind(model));

    runner.on(RunnerEvents.END_TEST, function(r) {
        if (r.equal) {
            model.addSuccess(r);
        } else {
            model.addFail(r);
        }
    });

    runner.on(RunnerEvents.ERROR, model.addError.bind(model));
    runner.on(RunnerEvents.WARNING, model.addWarning.bind(model));

    runner.on(RunnerEvents.END, function() {
        result.resolve(model.getResult());
    });

    return result.promise;
}

function logError(e) {
    console.error(e.stack);
}

function prepareImages(runner) {
    var imagesReady = q.defer(),
        queue = q(true);

    runner.on(RunnerEvents.WARNING, function(testResult) {
        queue = queue.then(function() {
            return copyImage(testResult.currentPath, lib.currentAbsolutePath(testResult));
        });
    });

    runner.on(RunnerEvents.ERROR, function(testResult) {
        queue = queue.then(function() {
            var imagePath = testResult.imagePath,
                imageCurrentPath = testResult.currentPath;

            if (!imagePath && !imageCurrentPath) {
                return;
            }

            var actualImagePath = lib.currentAbsolutePath(testResult);
            return makeDirFor(actualImagePath)
                .then(function() {
                    var src = imagePath || imageCurrentPath;
                    return copyImage(src, actualImagePath);
                });
        });
    });

    runner.on(RunnerEvents.END_TEST, function(testResult) {
        queue = queue.then(function() {
            return q.all([
                copyImage(testResult.currentPath, lib.currentAbsolutePath(testResult)),
                copyImage(testResult.referencePath, lib.referenceAbsolutePath(testResult)),
                testResult.equal || saveDiff(testResult, lib.diffAbsolutePath(testResult))
            ]);
        });
    });

    runner.on(RunnerEvents.END, function() {
        queue.then(imagesReady.resolve, imagesReady.reject);
    });

    return imagesReady.promise;
}

module.exports = function htmlReporter(tester) {
    q.all([
        prepareViewData(tester),
        prepareImages(tester)
    ])
        .spread(view.createHtml)
        .then(view.save)
        .fail(logError)
        .done();
};
