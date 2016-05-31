'use strict';

/**
 * Height of the element is larger than viewport
 */
module.exports = class HeightOutsideImageError {
    constructor(message) {
        this.name = 'HeightOutsideImageError';
        this.message = message;
    }
};
