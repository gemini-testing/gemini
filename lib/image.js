'use strict';

var q = require('q'),
    looksSame = require('looks-same'),
    PngImg = require('png-img'),
    utils = require('png-img/utils'),
    inherit = require('inherit');

var Image = inherit({
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
    },

    join: function(newImage) {
        const imageSize = this.getSize();

        this._img
            .setSize(imageSize.width, imageSize.height + newImage.getSize().height)
            .insert(newImage._img, 0, imageSize.height);

        return this;
    }
}, {
    fromBase64: function(base64) {
        return new Image(new Buffer(base64, 'base64'));
    },

    RGBToString: function(rgb) {
        return utils.RGBToString(rgb);
    },

    compare: function(path1, path2, opts) {
        opts = opts || {};
        var compareOptions = {
            ignoreCaret: opts.canHaveCaret
        };
        if ('tolerance' in opts) {
            compareOptions.tolerance = opts.tolerance;
        }
        return q.nfcall(looksSame, path1, path2, compareOptions);
    },

    buildDiff: function(opts) {
        var diffOptions = {
            reference: opts.reference,
            current: opts.current,
            diff: opts.diff,
            highlightColor: opts.diffColor
        };
        if ('tolerance' in opts) {
            diffOptions.tolerance = opts.tolerance;
        }
        return q.nfcall(looksSame.createDiff, diffOptions);
    }
});

module.exports = Image;
