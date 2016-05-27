'use strict';

/**
 * Identity area transformer. Returns original area as is.
 * @class IdentityTransformer
 * @type {IdentityTransformer}
 */
module.exports = class IdentityTransformer {
    /**
     * Transforms area
     * @param {Object} area
     * @returns {Object}
     */
    transform(area) {
        return area;
    }

    /**
     * @returns {IdentityTransformer}
     * @static
     */
    static create() {
        return new this();
    }
};
