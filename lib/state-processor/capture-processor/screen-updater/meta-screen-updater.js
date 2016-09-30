'use strict';

const Promise = require('bluebird');

const ScreenUpdater = require('./screen-updater');
const DiffUpdater = require('./diff-screen-updater');
const NewUpdater = require('./new-screen-updater');

module.exports = class MetaScreenUpdater extends ScreenUpdater {
    constructor() {
        super();

        this._diffUpdater = new DiffUpdater();
        this._newUpdater = new NewUpdater();
    }

    _processCapture(capture, opts, isRefExists) {
        return Promise.all([
            this._diffUpdater._processCapture(capture, opts, isRefExists),
            this._newUpdater._processCapture(capture, opts, isRefExists)
        ])
        .spread((diffUpdaterRes, newUpdaterRes) => diffUpdaterRes || newUpdaterRes);
    }
};
