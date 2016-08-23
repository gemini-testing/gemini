'use strict';

const q = require('q');

const globExtra = require('glob-extra');
const SetCollection = require('./set-collection');
const Suite = require('../suite');
const testsApi = require('../tests-api');
const utils = require('../utils');

const loadSuites = (sets, emitter) => {
    const rootSuite = Suite.create('');

    sets.forEachFile((path, browsers) => {
        global.gemini = testsApi(rootSuite, browsers);

        emitter.emit('beforeFileRead', path);
        utils.requireWithNoCache(path);
        emitter.emit('afterFileRead', path);

        delete global.gemini;
    });

    return rootSuite;
};

module.exports = (cli, config, emitter) => {
    return q.all([
        SetCollection.create(config, cli.sets),
        globExtra.expandPaths(cli.paths, {formats: ['.js']})
    ])
    .spread((sets, paths) => {
        sets.filterFiles(paths);

        return loadSuites(sets, emitter);
    });
};
