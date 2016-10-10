'use strict';

const fs = require('fs-extra');

const CaptureProcessor = require('../capture-processor');

module.exports = class ScreenUpdater extends CaptureProcessor {
    exec(capture, opts) {
        const refPath = opts.refPath;

        return fs.accessAsync(refPath)
            .then(
                () => this._processCapture(capture, opts, true),
                () => this._processCapture(capture, opts, false)
            )
            .then((updated) => ({imagePath: refPath, updated}));
    }

    _processCapture() {
        throw new Error('Not implemented');
    }
};
