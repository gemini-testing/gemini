'use strict';

/**
 * Non-fatal error, occurred during state run.
 * Fails only single state, not the whole app.
 */
function StateError(message, originalError) {
    Error.captureStackTrace(this, StateError);
    this.name = 'StateError';
    this.message = message;
    this.originalError = originalError;
}

StateError.prototype = Object.create(Error.prototype);
StateError.prototype.constructor = StateError;

module.exports = StateError;
