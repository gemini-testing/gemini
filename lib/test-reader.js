'use strict';

var _ = require('lodash'),
    q = require('q'),
    Suite = require('./suite'),
    pathUtils = require('./path-utils'),
    publicApi = require('./public-api'),
    exposeTestsApi = require('./tests-api'),
    utils = require('./utils');

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

///
function getFiles(sets) {
    return _(sets)
        .map('files')
        .flatten()
        .uniq()
        .value();
}

///
function expandSets(sets, projectRoot) {
    return _(sets)
        .map(function(set) {
            return pathUtils.expandPaths(set.files, projectRoot)
                .then(function(files) {
                    return _.extend(set, {files: files});
                });
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
        exposeTestsApi(publicApi, rootSuite, browsers);
        utils.requireWithNoCache(file);
    });

    return rootSuite;
}

function getBrowsers(file, sets, config) {
    var browsers = _(sets)
            .filter(function(set) {
                return _.includes(set.files, file);
            })
            .map('browsers')
            .flatten()
            .uniq()
            .value();

    return _.isEmpty(browsers)
        ? config.getBrowserIds()
        : browsers;
}
