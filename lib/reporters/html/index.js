'use strict';

var path = require('path'),

    q = require('q'),
    fs = require('q-io/fs'),

    view = require('./view'),
    ViewModel = require('./view-model'),
    lib = require('./lib');

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

    runner.on('skipState', model.addSkipped.bind(model));

    runner.on('endTest', function(r) {
        if (r.equal) {
            model.addSuccess(r);
        } else {
            model.addFail(r);
        }
    });

    runner.on('error', model.addError.bind(model));
    runner.on('warning', model.addWarning.bind(model));

    runner.on('end', function() {
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

    runner.on('endTest', function(testResult) {
        queue = queue.then(function() {
            return q.all([
                copyImage(testResult.currentPath, lib.currentAbsolutePath(testResult)),
                copyImage(testResult.referencePath, lib.referenceAbsolutePath(testResult)),
                testResult.equal || saveDiff(testResult, lib.diffAbsolutePath(testResult))
            ]);
        });
    });

    runner.on('end', function() {
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
