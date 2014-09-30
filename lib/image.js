'use strict';

var q = require('q'),
    looksSame = require('looks-same'),
    gm = require('gm'),
    inherit = require('inherit');

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
    compare: function(path1, path2, options) {
        options = options || {};
        return q.nfcall(looksSame, path1, path2, {
            strict: options.strictComparison,
            ignoreCaret: options.canHaveCaret
        });
    },

    buildDiff: function(opts) {
        return q.nfcall(looksSame.createDiff, {
            reference: opts.reference,
            current: opts.current,
            diff: opts.diff,
            highlightColor: opts.diffColor,
            strict: opts.strictComparison
        });
    }
});
