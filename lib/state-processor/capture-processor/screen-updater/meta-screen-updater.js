'use strict';

var inherit = require('inherit'),
    ScreenUpdater = require('./screen-updater'),
    DiffUpdater = require('./diff-screen-updater'),
    NewUpdater = require('./new-screen-updater'),

    util = require('q-promise-utils');

module.exports = inherit(ScreenUpdater, {
    __constructor: function() {
        this._diffUpdater = new DiffUpdater();
        this._newUpdater = new NewUpdater();
    },

    _processCapture: function(capture, opts, isRefExists) {
        return util.sequence([
            this._diffUpdater._processCapture.bind(this._diffUpdater, capture, opts, isRefExists),
            this._newUpdater._processCapture.bind(this._newUpdater, capture, opts, isRefExists)
        ]);
    }
});
