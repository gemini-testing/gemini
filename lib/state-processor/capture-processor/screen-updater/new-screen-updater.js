'use strict';

var fs = require('q-io/fs'),
    path = require('path'),
    ScreenUpdater = require('./screen-updater');

module.exports = class NewScreenUpdater extends ScreenUpdater {
    _processCapture(capture, opts, isRefExists) {
        if (isRefExists) {
            return;
        }

        return fs.makeTree(path.dirname(opts.refPath))
            .then(function() {
                return capture.image.save(opts.refPath);
            });
    }
};
