'use strict';

var DiffUpdater = require('./diff-screen-updater'),
    NewUpdater = require('./new-screen-updater'),
    MetaUpdater = require('./meta-screen-updater');

exports.create = function(config, opts) {
    if (opts.diff && !opts.new) {
        return new DiffUpdater(config, opts);
    }
    if (!opts.diff && opts.new) {
        return new NewUpdater(config, opts);
    }
    return new MetaUpdater(config, opts);
};
