'use strict';

var DiffUpdater = require('./diff-screen-updater'),
    NewUpdater = require('./new-screen-updater'),
    MetaUpdater = require('./meta-screen-updater');

exports.create = function(opts) {
    if (opts.diff && !opts.new) {
        return new DiffUpdater();
    }
    if (!opts.diff && opts.new) {
        return new NewUpdater();
    }
    return new MetaUpdater();
};
