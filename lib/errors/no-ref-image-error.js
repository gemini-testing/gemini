'use strict';

const StateError = require('./state-error');

module.exports = class NoRefImageError extends StateError {
    constructor(refImagePath, currentPath) {
        super(`Can not find reference image at ${refImagePath}.\n` +
            'Run `gemini update` command to capture all reference images.');

        this.name = 'NoRefImageError';
        this.currentPath = currentPath;
        this.refImagePath = refImagePath;
    }
};
