'use strict';

var fs = require('q-io/fs'),
    inherit = require('inherit'),
    temp = require('temp'),

    ImageProcessor = require('../../image-processor'),
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

    _doProcessCapture: function(capture, refPath, isRefExists) {
        if (!isRefExists) {
            return;
        }

        var tmpPath = this._tempPath(),
            tolerance = capture.state.tolerance;

        if (!tolerance && tolerance !== 0) {
            tolerance = capture.browser.config.tolerance;
        }

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
