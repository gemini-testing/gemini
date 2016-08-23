'use strict';

const fs = require('q-io/fs');

const CaptureProcessor = require('../capture-processor');

module.exports = class ScreenUpdater extends CaptureProcessor {
    exec(capture, opts) {
        const refPath = opts.refPath;

        return fs.exists(refPath)
            .then((isRefExists) => this._processCapture(capture, opts, isRefExists))
            .then((updated) => ({imagePath: refPath, updated}));
    }

    _processCapture() {
        throw new Error('Not implemented');
    }
};
