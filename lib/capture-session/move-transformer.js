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
    constructor(viewport) {
        this._offset = {
            top: viewport.top,
            left: viewport.left
        };
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
        return {
            top: area.top - this._offset.top,
            left: area.left - this._offset.left,
            width: area.width,
            height: area.height
        };
    }

    /**
     * @returns {MoveTransformer}
     * @static
     */
    static create(offset) {
        return new this(offset);
    }
};
