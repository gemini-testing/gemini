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

    runner.on(RunnerEvents.RETRY, model.addRetry.bind(model));

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
            return handleErrorEvent_(testResult);
        });
    });

    runner.on(RunnerEvents.RETRY, function(testResult) {
        queue = queue.then(function() {
            return testResult.hasOwnProperty('equal')
                ? handleEndTestEvent_(testResult)
                : handleErrorEvent_(testResult);
        });
    });

    runner.on(RunnerEvents.END_TEST, function(testResult) {
        queue = queue.then(function() {
            return handleEndTestEvent_(testResult);
        });
    });

    runner.on(RunnerEvents.END, function() {
        queue.then(imagesReady.resolve, imagesReady.reject);
    });

    return imagesReady.promise;

    function handleEndTestEvent_(testResult) {
        return q.all([
            copyImage(testResult.currentPath, lib.currentAbsolutePath(testResult)),
            copyImage(testResult.referencePath, lib.referenceAbsolutePath(testResult)),
            testResult.equal || saveDiff(testResult, lib.diffAbsolutePath(testResult))
        ]);
    }

    function handleErrorEvent_(testResult) {
        var src = testResult.imagePath || testResult.currentPath;

        return src && copyImage(src, lib.currentAbsolutePath(testResult));
    }
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
