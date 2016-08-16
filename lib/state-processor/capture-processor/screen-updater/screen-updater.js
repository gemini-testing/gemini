'use strict';

var fs = require('q-io/fs'),
    CaptureProcessor = require('../capture-processor');

module.exports = class ScreenUpdater extends CaptureProcessor {
    exec(capture, opts) {
        var refPath = opts.refPath,
            _this = this;

        return fs.exists(refPath)
            .then(function(isRefExists) {
                return _this._processCapture(capture, opts, isRefExists);
            })
            .then((updated) => ({imagePath: refPath, updated}));
    }

    _processCapture() {
        throw new Error('Not implemented');
    }
};
