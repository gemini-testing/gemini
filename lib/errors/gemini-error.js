'use strict';

module.exports = class GeminiError extends Error {
    constructor(message, advice) {
        super(message);

        this.name = 'GeminiError';
        this.advice = advice;
    }
};
