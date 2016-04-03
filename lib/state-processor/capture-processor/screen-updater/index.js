'use strict';

var DiffUpdater = require('./diff-screen-updater'),
    NewUpdater = require('./new-screen-updater'),
    MetaUpdater = require('./meta-screen-updater');

exports.create = function(config, opts) {
    if (opts.diff && !opts.new) {
        return new DiffUpdater(config);
    }
    if (!opts.diff && opts.new) {
        return new NewUpdater(config);
    }
    return new MetaUpdater(config);
};
