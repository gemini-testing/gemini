'use strict';

/**
 * Move area transformer. Substracts configured offsets from left and top of given area
 * @class MoveTransformer
 * @type {MoveTransformer}
 */
module.exports = class MoveTransformer {
    /**
     * @param {IdentityTransformer} baseTransformer
     * @param {Number} offset value
     * @constructor
     */
    constructor(baseTransformer, offset) {
        this._baseTransformer = baseTransformer;
        this._offset = offset;
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
            top: area.top - this._offset.top,
            left: area.left - this._offset.left,
            width: area.width,
            height: area.height
        };
    }

    /**
     * @param {IdentityTransformer} baseTransformer
     * @param offset value
     * @returns {MoveTransformer}
     * @static
     */
    static create(baseTransformer, offset) {
        return new this(baseTransformer, offset);
    }
};
