'use strict';

const q = require('q');
const looksSame = require('looks-same');
const PngImg = require('png-img');
const utils = require('png-img/utils');

class Image {
    constructor(buffer) {
        this._img = new PngImg(buffer);
    }

    crop(rect, opts) {
        rect = this._scale(rect, (opts || {}).scaleFactor);
        const imageSize = this.getSize();
        this._img.crop(
            Math.max(rect.left, 0),
            Math.max(rect.top, 0),
            Math.min(imageSize.width, rect.width),
            Math.min(imageSize.height, rect.height)
        );
        return q.resolve(this);
    }

    getSize() {
        return this._img.size();
    }

    getRGBA(x, y) {
        return this._img.get(x, y);
    }

    save(file) {
        return q.ninvoke(this._img, 'save', file);
    }

    clear(area, opts) {
        area = this._scale(area, (opts || {}).scaleFactor);
        this._img.fill(
            area.left,
            area.top,
            area.width,
            area.height,
            '#000000'
        );
    }

    join(newImage) {
        const imageSize = this.getSize();
        this._img
            .setSize(imageSize.width, imageSize.height + newImage.getSize().height)
            .insert(newImage._img, 0, imageSize.height);

        return this;
    }

    _scale(area, scaleFactor) {
        scaleFactor = scaleFactor || 1;
        return {
            left: area.left * scaleFactor,
            top: area.top * scaleFactor,
            width: area.width * scaleFactor,
            height: area.height * scaleFactor
        };
    }

    static fromBase64(base64) {
        return new Image(new Buffer(base64, 'base64'));
    }

    static RGBToString(rgb) {
        return utils.RGBToString(rgb);
    }

    static compare(path1, path2, opts) {
        opts = opts || {};
        const compareOptions = {
            ignoreCaret: opts.canHaveCaret,
            pixelRatio: opts.pixelRatio
        };
        if ('tolerance' in opts) {
            compareOptions.tolerance = opts.tolerance;
        }
        return q.nfcall(looksSame, path1, path2, compareOptions);
    }

    static buildDiff(opts) {
        const diffOptions = {
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
}

module.exports = Image;
