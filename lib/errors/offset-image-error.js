'use strict';

/**
 * The element is positioned outside of the viewport
 */
module.exports = class OffsetImageError {
    constructor(message) {
        this.name = 'OffsetImageError';
        this.message = message;
    }
};
