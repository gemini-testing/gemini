'use strict';

/**
 * Scale area transformer. Multiplies each area parameter on configured pixelRatio value
 * @class ScaleTransformer
 * @type {ScaleTransformer}
 */
module.exports = class ScaleTransformer {
    /**
     * @param {IdentityTransformer|MoveTransformer} baseTransformer
     * @param {Number} pixelRatio multiplier value
     * @constructor
     */
    constructor(baseTransformer, pixelRatio) {
        this._baseTransformer = baseTransformer;
        this._pixelRatio = pixelRatio;
    }

    /**
     * Transforms area
     * @param {Object} area
     * @param {Number} area.left - area left position
     * @param {Number} area.top - area top position
     * @param {Number} area.width - area width
     * @param {Number} area.height - area height
     * @returns {Object}
     */
    transform(area) {
        area = this._baseTransformer.transform(area);
        return {
            top: area.top * this._pixelRatio,
            left: area.left * this._pixelRatio,
            width: area.width * this._pixelRatio,
            height: area.height * this._pixelRatio
        };
    }

    /**
     * @param {IdentityTransformer|MoveTransformer} baseTransformer
     * @param {Number} pixelRatio multiplier value
     * @returns {ScaleTransformer}
     * @static
     */
    static create(baseTransformer, pixelRatio) {
        return new this(baseTransformer, pixelRatio);
    }
};
