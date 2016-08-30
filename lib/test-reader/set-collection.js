'use strict';

const _ = require('lodash');
const q = require('q');

const GeminiError = require('../errors/gemini-error');
const globExtra = require('glob-extra');
const TestSet = require('./test-set');

module.exports = class SetCollection {
    static create(config, sets) {
        let filteredSets = SetCollection._filter(config.sets, sets);

        if (_.isEmpty(filteredSets)) {
            filteredSets = [{files: {}, browsers: config.getBrowserIds()}];
        }

        return SetCollection._expand(filteredSets, config.system.projectRoot)
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

    static _expand(sets, projectRoot) {
        return _(sets)
            .map((set) => {
                return globExtra.expandPaths(set.files, {formats: ['.js'], root: projectRoot})
                    .then((files) => _.extend(set, {files}));
            })
            .thru(q.all)
            .value();
    }

    constructor(sets) {
        this._sets = _.map(sets, (set) => TestSet.create(set));
    }

    filterFiles(files) {
        this._sets.forEach((set) => set.filterFiles(files));
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
};
