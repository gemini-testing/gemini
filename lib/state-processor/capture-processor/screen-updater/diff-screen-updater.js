'use strict';

var fs = require('q-io/fs'),
    inherit = require('inherit'),
    temp = require('temp'),

    ImageProcessor = require('../../../image-processor'),
    ScreenUpdater = require('./screen-updater');

temp.track();

module.exports = inherit(ScreenUpdater, {
    __constructor: function(config, options) {
        this.__base(config);
        options = options || {};
        this._tempDir = options.tempDir || temp.path('gemini');
        this._imageProcessor = null;
    },

    prepare: function(emitter) {
        this._imageProcessor = new ImageProcessor(emitter);
        return fs.makeTree(this._tempDir);
    },

    _processCapture: function(capture, env, isRefExists) {
        if (!isRefExists) {
            return;
        }

        var refPath = env.refPath,
            tmpPath = this._tempPath(),
            tolerance = env.tolerance;

        return capture.image.save(tmpPath)
            .then(function() {
                return this._imageProcessor.compare(tmpPath, refPath, {
                        canHaveCaret: capture.canHaveCaret,
                        tolerance: tolerance
                    })
                    .then(function(isEqual) {
                        if (!isEqual) {
                            return fs.copy(tmpPath, refPath);
                        }
                    });
            }.bind(this));
    },

    _tempPath: function() {
        return temp.path({dir: this._tempDir, suffix: '.png'});
    }
});
