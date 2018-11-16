'use strict';

const StateError = require('./state-error');

module.exports = class NoRefImageError extends StateError {
    constructor(refImg = {}, currImg = {}) {
        super(`Can not find reference image at ${refImg.path}.\n` +
            'Run `gemini update` command to capture all reference images.');

        this.name = 'NoRefImageError';
        this.refImg = refImg;
        this.currImg = currImg;
    }
};
