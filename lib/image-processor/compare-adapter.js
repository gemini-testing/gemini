'use strict';

var looksSame = require('looks-same');

exports.compare = function(opts, cb) {
    var compareOptions = {
        ignoreCaret: opts.canHaveCaret
    };
    if ('tolerance' in opts) {
        compareOptions.tolerance = opts.tolerance;
    }
    looksSame(opts.path1, opts.path2, compareOptions, cb);
};

exports.buildDiff = function(opts, cb) {
    var diffOptions = {
        reference: opts.reference,
        current: opts.current,
        diff: opts.diff,
        highlightColor: opts.diffColor
    };
    if ('tolerance' in opts) {
        diffOptions.tolerance = opts.tolerance;
    }
    looksSame.createDiff(diffOptions, cb);
};
