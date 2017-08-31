'use strict';

module.exports = class CancelledError extends Error {
    constructor() {
        super('Browser request was cancelled');
        this.name = 'CancelledError';
    }
};
