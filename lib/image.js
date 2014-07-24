'use strict';

var q = require('q'),
    gm = require('gm'),
    inherit = require('inherit');

var gmCompare = q.denodeify(gm.compare.bind(gm));

module.exports = inherit({
    __constructor: function(buffer) {
        this._gm = gm(buffer);
    },

    crop: function crop(rect) {
        this._gm.crop(rect.width, rect.height, rect.left, rect.top);
        return q.resolve(this);
    },

    getSize: function() {
        return q.ninvoke(this._gm, 'size');
    },

    save: function save(file) {
        var d = q.defer();
        this._gm.write(file, function(error) {
            if (error) {
                return d.reject(error);
            }
            d.fulfill(file);
        });
        return d.promise;
    }
}, {
    compare: function(path1, path2, tolerance) {
        tolerance = tolerance || 0;
        return gmCompare(path1, path2, tolerance).spread(function(equal) {
            return equal;
        });
    },

    buildDiff: function(ref, image, diff) {
        return gmCompare(ref, image, {file: diff});
    }
});
