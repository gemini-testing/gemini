'use strict';

var _ = require('lodash'),
    q = require('q'),
    Suite = require('./suite'),
    pathUtils = require('./path-utils'),
    testsApi = require('./tests-api'),
    utils = require('./utils');

const getFiles = (sets) => {
    return _(sets)
        .map('files')
        .flatten()
        .uniq()
        .value();
};

const expandSets = (sets, projectRoot) => {
    return _(sets)
        .map((set) => {
            return pathUtils.expandPaths(set.files, projectRoot)
                .then((files) => _.extend(set, {files}));
        })
        .thru(q.all)
        .value();
};

/**
 * @param {String[]} files
 * @param {Object[]} sets
 * @param {Config} config
 * @return {Suite} root suite
 */

const getBrowsers = (file, sets, config) => {
    const browsers = _(sets)
        .filter((set) => _.contains(set.files, file))
        .map('browsers')
        .flatten()
        .uniq()
        .value();

    return _.isEmpty(browsers) ? config.getBrowserIds() : browsers;
};

const loadSuites = (files, sets, config, emmiter) => {
    const rootSuite = Suite.create('');

    files.forEach((file) => {
        const browsers = getBrowsers(file, sets, config);

        global.gemini = testsApi(rootSuite, browsers);
        emmiter.emit('beforeFileRead', file);
        utils.requireWithNoCache(file);
        emmiter.emit('afterFileRead', file);
        delete global.gemini;
    });

    return rootSuite;
};

module.exports = (paths, config, emmiter) => {
    return q.all([
        expandSets(config.sets, config.system.projectRoot),
        pathUtils.expandPaths(paths)
    ])
    .spread((sets, filesToRun) => {
        const files = _.isEmpty(filesToRun) ? getFiles(sets) : filesToRun;

        return loadSuites(files, sets, config, emmiter);
    });
};
