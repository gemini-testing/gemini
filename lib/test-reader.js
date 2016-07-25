'use strict';

const _ = require('lodash');
const q = require('q');
const Suite = require('./suite');
const pathUtils = require('./path-utils');
const testsApi = require('./tests-api');
const utils = require('./utils');
const glob = require('glob');

const getFiles = (sets) => {
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

const expandSets = (sets, projectRoot) => {
    return _(sets)
        .map((set) => {
            return _(set.files)
                .map(getFilesByTemplate)
                .thru(q.all)
                .value()
                .then(_.flatten)
                .then((result) => {
                    return pathUtils.expandPaths(result, projectRoot)
                        .then((files) => _.extend(set, {files: files}));
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

const getBrowsers = (file, sets, config) => {
    const browsers = _(sets)
            .filter((set) => _.contains(set.files, file))
            .map('browsers')
            .flatten()
            .uniq()
            .value();

    return _.isEmpty(browsers)
        ? config.getBrowserIds()
        : browsers;
}

const loadSuites = (files, sets, config) => {
    const rootSuite = Suite.create('');

    files.forEach((file) => {
        const browsers = getBrowsers(file, sets, config);
        global.gemini = testsApi(rootSuite, browsers);
        utils.requireWithNoCache(file);
        delete global.gemini;
    });

    return rootSuite;
}

module.exports = (paths, config) => {
    return q.all([
        expandSets(config.sets, config.system.projectRoot),
        pathUtils.expandPaths(paths || [])
    ])
    .spread((sets, filesToRun) => {
        const files = _.isEmpty(filesToRun)
        ? getFiles(sets)
        : filesToRun;

        return loadSuites(files, sets, config);
    });
};
