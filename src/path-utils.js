'use strict';
var q = require('q'),
    fs = require('q-io/fs'),
    _ = require('lodash');

exports.expandPath = function expandPath(path, root) {
    if (root && !fs.isAbsolute(path)) {
        path = fs.join(root, path);
    }

    return fs.stat(path)
        .then(function(stat) {
            if (!stat.isDirectory()) {
                return [path];
            }
            return fs.listTree(path, function(path) {
                return fs.extension(path) === '.js';
            });
        })
        .fail(function(e) {
            return [];
        })
        .then(function(paths) {
            return paths.map(fs.absolute.bind(fs));
        });
};

exports.expandPaths = function expandPaths(paths, root) {
    return _(paths)
        .map(_.partial(exports.expandPath, _, root))
        .thru(q.all).value()
        .then(_.flatten);
};
