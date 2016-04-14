'use strict';

var fs = require('q-io/fs'),
    inherit = require('inherit'),
    temp = require('../../../temp'),

    ImageProcessor = require('../../../image-processor'),
    ScreenUpdater = require('./screen-updater');

module.exports = inherit(ScreenUpdater, {
    __constructor: function() {
        this._imageProcessor = null;
    },

    prepare: function(emitter) {
        this._imageProcessor = new ImageProcessor(emitter);
        return this.__base(emitter);
    },

    _processCapture: function(capture, opts, isRefExists) {
        if (!isRefExists) {
            return;
        }

        var refPath = opts.refPath,
            tmpPath = temp.path({suffix: '.png'}),
            tolerance = opts.tolerance;

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
    }
});
