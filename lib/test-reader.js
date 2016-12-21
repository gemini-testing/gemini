'use strict';

const _ = require('lodash');
const SetsBuilder = require('gemini-core').SetsBuilder;
const Suite = require('./suite');
const Events = require('./constants/events');
const testsApi = require('./tests-api');
const utils = require('./utils');

const DEFAULT_DIR = require('../package').name;

const loadSuites = (sets, emitter) => {
    const rootSuite = Suite.create('');

    _.forEach(sets.groupByFile(), (browsers, path) => {
        global.gemini = testsApi(rootSuite, browsers);

        emitter.emit(Events.BEFORE_FILE_READ, path);
        utils.requireWithNoCache(path);
        emitter.emit(Events.AFTER_FILE_READ, path);

        delete global.gemini;
    });

    return rootSuite;
};

module.exports = (emitter, config, opts) => {
    return SetsBuilder
        .create(config.sets, {defaultDir: DEFAULT_DIR})
        .useSets(opts.sets)
        .useFiles(opts.paths)
        .useBrowsers(opts.browsers)
        .build(config.system.projectRoot, {ignore: config.system.exclude})
        .then((setCollection) => loadSuites(setCollection, emitter));
};
