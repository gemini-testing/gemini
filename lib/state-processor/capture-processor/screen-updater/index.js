'use strict';

const DiffUpdater = require('./diff-screen-updater');
const NewUpdater = require('./new-screen-updater');
const MetaUpdater = require('./meta-screen-updater');

exports.create = (opts) => {
    if (opts.diff && !opts.new) {
        return new DiffUpdater();
    }
    if (!opts.diff && opts.new) {
        return new NewUpdater();
    }
    return new MetaUpdater();
};
