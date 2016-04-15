'use strict';

var fs = require('q-io/fs'),
    path = require('path'),
    CaptureProcessor = require('./capture-processor');

module.exports = class ScreenShooter extends CaptureProcessor {
    static create() {
        return new ScreenShooter();
    }

    exec(capture, opts) {
        var savePath = opts.refPath;

        //TODO: create directories only once
        return fs.makeTree(path.dirname(savePath))
            .then(function() {
                return capture.image.save(savePath);
            })
            .thenResolve({imagePath: savePath});
    }
};
