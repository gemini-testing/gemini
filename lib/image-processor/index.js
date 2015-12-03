'use strict';

var q = require('q'),
    _ = require('lodash'),
    inherit = require('inherit'),
    compareAdapter = require('./compare-adapter'),
    ParallelComporator = require('./parallel-comparator');

var ImageProcessor = inherit({
    __constructor: function(comparator) {
        this._comparator = _.bindAll(comparator);
    },

    compare: function(path1, path2, opts) {
        return q.nfcall(this._comparator.compare, _.extend(opts || {}, {
            path1: path1,
            path2: path2
        }));
    },

    buildDiff: function(opts) {
        return q.nfcall(this._comparator.buildDiff, opts);
    }
}, {
    create: function(config, emitter) {
        var comparator = _.get(config, 'system.multiProcess')
            ? new ParallelComporator(emitter)
            : compareAdapter;

        return new ImageProcessor(comparator);
    }
});

module.exports = ImageProcessor;
