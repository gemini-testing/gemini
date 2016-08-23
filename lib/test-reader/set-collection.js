'use strict';

const _ = require('lodash');
const q = require('q');

const GeminiError = require('../errors/gemini-error');
const pathUtils = require('./path-utils');
const Set = require('./set');

module.exports = class SetCollection {
    static create(config, sets) {
        const filteredSets = SetCollection._filter(config.sets, sets);

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
            throw new GeminiError(
                `No such sets: ${unknownSets.join(', ')}. Use one of the sets, specified ` +
                `in config file: ${_.keys(sets).join(', ')}`
            );
        }
    }

    static _expand(sets, projectRoot) {
        return _(sets)
            .map((set) => {
                return pathUtils.expandPaths(set.files, projectRoot)
                    .then((files) => _.extend(set, {files}));
            })
            .thru(q.all)
            .value();
    }

    constructor(sets) {
        this._sets = _.map(sets, (set) => Set.create(set));
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
