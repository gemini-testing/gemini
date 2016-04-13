'use strict';

var fs = require('q-io/fs'),
    path = require('path'),
    inherit = require('inherit'),
    ScreenUpdater = require('./screen-updater');

module.exports = inherit(ScreenUpdater, {
    _processCapture: function(capture, opts, isRefExists) {
        if (isRefExists) {
            return;
        }

        return fs.makeTree(path.dirname(opts.refPath))
            .then(function() {
                return capture.image.save(opts.refPath);
            });
    }
});
