'use strict';

var _ = require('lodash'),
    q = require('q'),
    Suite = require('./suite'),
    pathUtils = require('./path-utils'),
    testsApi = require('./tests-api'),
    utils = require('./utils'),
    glob = require('glob');

module.exports = function(paths, config) {
    return q.all([
        expandSets(config.sets, config.system.projectRoot),
        pathUtils.expandPaths(paths || [])
    ])
        .spread(function(sets, filesToRun) {
            var files = _.isEmpty(filesToRun)
                    ? getFiles(sets)
                    : filesToRun;

            return loadSuites(files, sets, config);
        });
};

function getFiles(sets) {
    return _(sets)
        .map('files')
        .flatten()
        .uniq()
        .value();
}

const getFilesByTemplate = (path) => {
    return q.Promise((resolve, reject) => {
        return glob(path, (err, files) => err ? reject(err) : resolve(files));
    });
};

function expandSets(sets, projectRoot) {
    return _(sets)
        .map(function(set) {
            return _(set.files)
                .map(getFilesByTemplate)
                .thru(q.all)
                .value()
                .then(_.flatten)
                .then(function(result) {
                    return pathUtils.expandPaths(result, projectRoot)
                        .then(function(files) {
                            return _.extend(set, {files: files});
                        });
                })
        })
        .thru(q.all)
        .value();
}

/**
 * @param {String[]} files
 * @param {Objct[]} sets
 * @param {Config} config
 * @return {Suite} root suite
 */
function loadSuites(files, sets, config) {
    var rootSuite = Suite.create('');

    files.forEach(function(file) {
        var browsers = getBrowsers(file, sets, config);
        global.gemini = testsApi(rootSuite, browsers);
        utils.requireWithNoCache(file);
        delete global.gemini;
    });

    return rootSuite;
}

function getBrowsers(file, sets, config) {
    var browsers = _(sets)
            .filter(function(set) {
                return _.contains(set.files, file);
            })
            .map('browsers')
            .flatten()
            .uniq()
            .value();

    return _.isEmpty(browsers)
        ? config.getBrowserIds()
        : browsers;
}
