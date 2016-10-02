'use strict';

const _ = require('lodash');
const mm = require('micromatch');

module.exports = class TestSet {
    static create(set, opts) {
        opts = opts || {};
        return new TestSet(set, opts);
    }

    constructor(set, opts) {
        this._set = set;
        this._set.allFilesMasks = !!opts.allFilesMasks;
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

        if (this._set.allFilesMasks) {
            return mm(files, this._set.files);
        }

        return _.isEmpty(files)
            ? this._set.files
            : _.intersection(files, this._set.files);
    }
};
