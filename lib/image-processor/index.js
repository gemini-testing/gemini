'use strict';

var q = require('q'),
    _ = require('lodash'),
    inherit = require('inherit'),
    workerFarm = require('worker-farm'),
    RunnerEvents = require('../constants/runner-events');

var ImageProcessor = inherit({
    __constructor: function(emitter) {
        this._workers = workerFarm(require.resolve('./compare-adapter'), ['compare', 'buildDiff']);
        emitter.on(RunnerEvents.END, function() {
            workerFarm.end(this._workers);
        }.bind(this));
    },

    compare: function(path1, path2, opts) {
        return q.nfcall(this._workers.compare, _.extend(opts || {}, {
            path1: path1,
            path2: path2
        }));
    },

    buildDiff: function(opts) {
        return q.nfcall(this._workers.buildDiff, opts);
    }
});

module.exports = ImageProcessor;
