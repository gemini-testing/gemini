'use strict';
exports.FULL = 'full';
exports.PARTIAL = 'partial';
exports.NONE = 'none';

exports.merge = function(oldValue, newValue) {
    oldValue = oldValue || exports.NONE;
    if (oldValue === exports.FULL || newValue === exports.FULL) {
        return exports.FULL;
    }

    if (oldValue === exports.PARTIAL || newValue === exports.PARTIAL) {
        return exports.PARTIAL;
    }

    return exports.NONE;
};
