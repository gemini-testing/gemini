'use strict';
var q = require('q'),
    fs = require('q-io/fs');

exports.expandPath = function expandPath(path) {
    return fs.isDirectory(path)
        .then(function(isDir) {
            if (!isDir) {
                return [path];
            }
            return  fs.listTree(path, function(path) {
                return fs.extension(path) === '.js';
            });
        })
        .then(function(paths) {
            return paths.map(fs.absolute.bind(fs));
        });
};

exports.expandPaths = function expandPaths(paths) {
    return q.all(paths.map(exports.expandPath))
        .then(function(expanded) {
            return expanded.reduce(function(a, b) {
                return a.concat(b);
            });
        });
};
