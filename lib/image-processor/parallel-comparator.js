'use strict';

var workerFarm = require('worker-farm'),
    inherit = require('inherit'),
    RunnerEvents = require('../constants/runner-events');

var ParallelComporator = inherit({
    __constructor: function(emitter) {
        this._workers = workerFarm(require.resolve('./compare-adapter'), ['compare', 'buildDiff']);
        emitter.on(RunnerEvents.END, function() {
            workerFarm.end(this._workers);
        }.bind(this));
    },

    compare: function() {
        return this._workers.compare.apply(this._workers, arguments);
    },

    buildDiff: function() {
        return this._workers.buildDiff.apply(this._workers, arguments);
    }
});

module.exports = ParallelComporator;
