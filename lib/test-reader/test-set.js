'use strict';

const _ = require('lodash');

module.exports = class TestSet {
    static create(set) {
        return new TestSet(set);
    }

    constructor(set) {
        this._set = set;
    }

    getFiles() {
        return this._set.files;
    }

    getBrowsers(path) {
        return _.includes(this._set.files, path) ? this._set.browsers : [];
    }

    filterFiles(files) {
        this._set.files = this._getFilteredFiles(files);
    }

    _getFilteredFiles(files) {
        if (_.isEmpty(this._set.files)) {
            return files;
        }

        return _.isEmpty(files)
            ? this._set.files
            : _.intersection(files, this._set.files);
    }
};
