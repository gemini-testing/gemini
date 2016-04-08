'use strict';

var q = require('q'),
    inherit = require('inherit'),
    fs = require('q-io/fs'),
    temp = require('../../temp'),

    CaptureProcessor = require('./capture-processor'),
    ImageProcessor = require('../../image-processor'),
    NoRefImageError = require('../../errors/no-ref-image-error'),

    RunnerEvents = require('../../constants/runner-events');

module.exports = inherit(CaptureProcessor, {
    __constructor: function(config) {
        this.__base(config);
        this._imageProcessor = null;
    },

    getProcessedCaptureEventName: function() {
        return RunnerEvents.END_TEST;
    },

    prepare: function(emitter) {
        this._imageProcessor = new ImageProcessor(emitter);
        return this.__base(emitter);
    },

    exec: function(capture, opts) {
        var refPath = opts.refPath,
            tmpPath = temp.path({suffix: '.png'}),
            tolerance = opts.tolerance,
            _this = this;

        return capture.image.save(tmpPath)
            .then(function() {
                return fs.exists(refPath);
            })
            .then(function(refExists) {
                if (!refExists) {
                    return q.reject(new NoRefImageError(refPath, tmpPath));
                }
            })
            .then(function() {
                return [tmpPath, _this._imageProcessor.compare(tmpPath, refPath, {
                    canHaveCaret: capture.canHaveCaret,
                    tolerance: tolerance
                })];
            })
            .spread(function(currentPath, isEqual) {
                return {
                    referencePath: refPath,
                    currentPath: currentPath,
                    equal: isEqual,
                    saveDiffTo: function(diffPath) {
                        return _this._imageProcessor.buildDiff({
                            reference: refPath,
                            current: currentPath,
                            diff: diffPath,
                            diffColor: _this._config.system.diffColor,
                            tolerance: tolerance
                        });
                    }
                };
            });
    }
});
