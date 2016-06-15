'use strict';

/**
 * Height of the element is larger than viewport
 */
module.exports = class HeightViewportError extends Error {
    constructor(message) {
        super(message);

        this.name = this.constructor.name;
    }
};
