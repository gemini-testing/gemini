'use strict';

/**
 * Non-fatal error, occurred during state run.
 * Fails only single state, not the whole app.
 */

module.exports = class StateError extends Error {
    constructor(message, originalError) {
        super(message);

        this.name = 'StateError';
        this.originalError = originalError;
    }
};
