'use strict';

module.exports = class CancelledError extends Error {
    constructor() {
        super();

        this.name = 'CancelledError';
        this.message = 'Browser request was cancelled';
        Error.captureStackTrace(this, CancelledError);
    }
};
