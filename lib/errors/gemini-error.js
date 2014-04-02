'use strict';
/**
 * Special type of error that intended to be reported
 * to user. Will not print stack trace by default.
 */
function GeminiError(message, advice) {
    Error.captureStackTrace(this, GeminiError);
    this.name = 'GeminError';
    this.message = message;
    this.advice = advice;
}

GeminiError.prototype = Object.create(Error.prototype);
GeminiError.prototype.constructor = GeminiError;

module.exports = GeminiError;
