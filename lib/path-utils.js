'use strict';

const q = require('q');
const qfs = require('q-io/fs');
const _ = require('lodash');
const glob = require('glob');

const getFilesByMask = (path) => q.denodeify(glob)(path);

const listJsFiles = (path) => {
    return qfs.listTree(path)
        .then((paths) => paths.filter((p) => qfs.extension(p) === '.js'));
};

const expandPath = (path) => {
    return qfs.stat(path)
        .then((stat) => stat.isDirectory() ? listJsFiles(path) : [path])
        .then((paths) => paths.map((p) => qfs.absolute(p)));
};

const processPaths = (paths, callback) => {
    return _(paths)
        .map(callback)
        .thru(q.all).value()
        .then(_.flatten)
        .then(_.uniq);
};

exports.expandPaths = (paths) => {
    return processPaths(paths, getFilesByMask)
        .then((matchedPaths) => processPaths(matchedPaths, expandPath));
};
