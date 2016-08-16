'use strict';

var ScreenUpdater = require('./screen-updater'),
    DiffUpdater = require('./diff-screen-updater'),
    NewUpdater = require('./new-screen-updater'),

    q = require('q');

module.exports = class MetaScreenUpdater extends ScreenUpdater {
    constructor() {
        super();

        this._diffUpdater = new DiffUpdater();
        this._newUpdater = new NewUpdater();
    }

    _processCapture(capture, opts, isRefExists) {
        return q.all([
            this._diffUpdater._processCapture(capture, opts, isRefExists),
            this._newUpdater._processCapture(capture, opts, isRefExists)
        ])
        .spread((diffUpdaterRes, newUpdaterRes) => diffUpdaterRes || newUpdaterRes);
    }
};
