'use strict';

var q = require('q'),
    looksSame = require('looks-same'),
    PngImg = require('png-img'),
    utils = require('png-img/utils'),
    inherit = require('inherit');

module.exports = inherit({
    __constructor: function(buffer) {
        this._img = new PngImg(buffer);
    },

    crop: function crop(rect) {
        this._img.crop(rect.left, rect.top, rect.width, rect.height);
        return q.resolve(this);
    },

    getSize: function() {
        return this._img.size();
    },

    getRGBA: function(x, y) {
        return this._img.get(x, y);
    },

    save: function save(file) {
        return q.ninvoke(this._img, 'save', file);
    },

    clear: function clear(area) {
        this._img.fill(
            area.left,
            area.top,
            area.width,
            area.height,
            '#000000'
        );
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
    },

    RGBToString: function(rgb) {
        return utils.RGBToString(rgb);
    }
});
