'use strict';

const path = require('path');

const _ = require('lodash');
const globExtra = require('glob-extra');
const q = require('q');

const SetCollection = require('./set-collection');
const Suite = require('../suite');
const Events = require('../constants/events');
const testsApi = require('../tests-api');
const utils = require('../utils');

const loadSuites = (sets, emitter) => {
    const rootSuite = Suite.create('');

    sets.forEachFile((path, browsers) => {
        global.gemini = testsApi(rootSuite, browsers);

        emitter.emit(Events.BEFORE_FILE_READ, path);
        utils.requireWithNoCache(path);
        emitter.emit(Events.AFTER_FILE_READ, path);

        delete global.gemini;
    });

    return rootSuite;
};

const filesExist = (configSets, cliPaths) => {
    return !_.isEmpty(configSets) || !_.isEmpty(cliPaths);
};

const getGeminiPath = (projectRoot) => path.resolve(projectRoot, 'gemini');

module.exports = (cli, config, emitter) => {
    const files = filesExist(config.sets, cli.paths)
        ? cli.paths
        : [getGeminiPath(config.system.projectRoot)];

    return q.all([
        SetCollection.create(config, cli.sets),
        globExtra.expandPaths(files, {formats: ['.js']})
    ])
    .spread((sets, paths) => {
        sets.filterFiles(paths);

        return loadSuites(sets, emitter);
    });
};
