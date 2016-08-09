'use strict';

const _ = require('lodash');

module.exports = class Set {
    static create(set) {
        return new Set(set);
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
        if (!_.isEmpty(files)) {
            this._set.files = _.intersection(files, this._set.files);
        }
    }
};
