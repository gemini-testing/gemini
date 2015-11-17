'use strict';

/**
 * Critical error, occurred on grid-side.
 * @param {Array} errors
 */
function MetaError(errors) {
    this.name = 'MetaError';
    this.message = errors;
}

MetaError.prototype = Object.create(Error.prototype);
MetaError.prototype.constructor = MetaError;

module.exports = MetaError;
