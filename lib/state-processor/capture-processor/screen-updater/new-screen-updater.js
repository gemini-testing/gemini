'use strict';

var fs = require('q-io/fs'),
    path = require('path'),
    inherit = require('inherit'),
    ScreenUpdater = require('./screen-updater');

module.exports = inherit(ScreenUpdater, {
    _processCapture: function(capture, env, isRefExists) {
        if (isRefExists) {
            return;
        }

        return fs.makeTree(path.dirname(env.refPath))
            .then(function() {
                return capture.image.save(env.refPath);
            });
    }
});
