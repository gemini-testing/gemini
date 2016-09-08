'use strict';

module.exports = class SafeRect {
    static create(rect, imageSize) {
        return new SafeRect(rect, imageSize);
    }

    constructor(rect, imageSize) {
        this._rect = rect;
        this._imageSize = imageSize;
    }

    get left() {
        return this._calcCoord('left');
    }

    get top() {
        return this._calcCoord('top');
    }

    _calcCoord(coord) {
        return Math.max(this._rect[coord], 0);
    }

    get width() {
        return this._calcSize('width', 'left');
    }

    get height() {
        return this._calcSize('height', 'top');
    }

    _calcSize(size, coord) {
        const rectCoord = this._calcCoord(coord);

        return Math.min(this._rect[size], this._imageSize[size] - rectCoord);
    }
};
