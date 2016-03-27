'use strict';

var fs = require('q-io/fs'),
    path = require('path'),
    inherit = require('inherit'),
    ScreenUpdater = require('./screen-updater');

module.exports = inherit(ScreenUpdater, {
    _doProcessCapture: function(capture, refPath, isRefExists) {
        if (isRefExists) {
            return;
        }

        return fs.makeTree(path.dirname(refPath))
            .then(function() {
                return capture.image.save(refPath);
            });
    }
});
