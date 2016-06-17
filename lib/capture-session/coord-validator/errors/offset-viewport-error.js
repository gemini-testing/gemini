'use strict';

/**
 * Position of an element is outside of a viewport left, top or right bounds
 */
module.exports = class OffsetViewportError extends Error {
    constructor(message) {
        super(message);

        this.name = this.constructor.name;
    }
};
