'use strict';

const globExtra = require('glob-extra');
const _ = require('lodash');
const path = require('path');
const Promise = require('bluebird');

const GeminiError = require('../errors/gemini-error');
const TestSet = require('./test-set');

module.exports = class SetCollection {
    static create(config, opts, expandOpts, globOpts) {
        const projectRoot = config.system.projectRoot;

        let filteredSets = SetCollection._filter(config.sets, opts.sets);

        if (_.isEmpty(filteredSets)) {
            filteredSets = [{files: [], browsers: config.getBrowserIds()}];
        } else if (!_.isEmpty(opts.paths) && SetCollection._isAllFilesMasks(filteredSets)) {
            const sets = SetCollection._resolve(filteredSets, projectRoot);

            return Promise.try(() => new SetCollection(sets, {allFilesMasks: true}));
        }

        expandOpts = _.defaults(expandOpts, {root: projectRoot});

        return SetCollection._expand(filteredSets, expandOpts, globOpts)
            .then((sets) => new SetCollection(sets));
    }

    static _filter(sets, setsToUse) {
        if (_.isEmpty(setsToUse)) {
            return sets;
        }

        SetCollection._assertUnknownSets(sets, setsToUse);

        return _.pick(sets, setsToUse);
    }

    static _assertUnknownSets(sets, setsToUse) {
        const unknownSets = _.difference(setsToUse, _.keys(sets));

        if (!_.isEmpty(unknownSets)) {
            let error = `No such sets: ${unknownSets.join(', ')}.`;

            if (!_.isEmpty(sets)) {
                error += ` Use one of the sets, specified in config file: ${_.keys(sets).join(', ')}`;
            }

            throw new GeminiError(error);
        }
    }

    static _expand(sets, expandOpts, globOpts) {
        return _(sets)
            .map((set) => {
                return globExtra.expandPaths(set.files, expandOpts, globOpts)
                    .then((files) => _.extend(set, {files}));
            })
            .thru(Promise.all)
            .value();
    }

    static _resolve(sets, projectRoot) {
        return _(sets)
            .map((set) => {
                set.files = [].concat(set.files);
                const resolvedFiles = set.files.map((file) => path.resolve(projectRoot, file));
                return _.extend(set, {files: resolvedFiles});
            })
            .value();
    }

    static _isAllFilesMasks(sets) {
        return _.every(sets, (set) => globExtra.isMasks(set.files));
    }

    constructor(sets, opts) {
        this._sets = _.map(sets, (set) => TestSet.create(set, opts));
    }

    filterFiles(files) {
        this._sets.forEach((set) => set.filterFiles(files));
        this._assertEmptyFiles();
    }

    forEachFile(cb) {
        this._getFiles().forEach((path) => cb(path, this._getBrowsers(path)));
    }

    _getFiles() {
        return this._getFromSets((set) => set.getFiles());
    }

    _getBrowsers(path) {
        return this._getFromSets((set) => set.getBrowsers(path));
    }

    _getFromSets(cb) {
        return _(this._sets)
            .map(cb)
            .flatten()
            .uniq()
            .value();
    }

    _assertEmptyFiles() {
        if (_.isEmpty(this._getFiles())) {
            throw new GeminiError('Cannot find files by masks in sets');
        }
    }
};
