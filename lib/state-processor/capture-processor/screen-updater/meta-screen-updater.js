'use strict';

var q = require('q'),
    inherit = require('inherit'),
    ScreenUpdater = require('./screen-updater'),
    DiffUpdater = require('./diff-screen-updater'),
    NewUpdater = require('./new-screen-updater'),

    util = require('q-promise-utils');

module.exports = inherit(ScreenUpdater, {
    __constructor: function(config, options) {
        this.__base(config);
        this._diffUpdater = new DiffUpdater(config, options);
        this._newUpdater = new NewUpdater(config);
    },

    prepare: function(emitter) {
        return q.all([
            this._diffUpdater.prepare(emitter),
            this._newUpdater.prepare(emitter)
        ]);
    },

    _processCapture: function(capture, env, isRefExists) {
        return util.sequence([
            this._diffUpdater._processCapture.bind(this._diffUpdater, capture, env, isRefExists),
            this._newUpdater._processCapture.bind(this._newUpdater, capture, env, isRefExists)
        ]);
    }
});
