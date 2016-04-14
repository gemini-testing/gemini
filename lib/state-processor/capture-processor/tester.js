'use strict';

var q = require('q'),
    inherit = require('inherit'),
    fs = require('q-io/fs'),
    temp = require('../../temp'),

    CaptureProcessor = require('./capture-processor'),
    Image = require('../../image'),
    NoRefImageError = require('../../errors/no-ref-image-error'),

    RunnerEvents = require('../../constants/runner-events');

module.exports = inherit(CaptureProcessor, {
    __constructor: function(diffColor) {
        this._diffColor = diffColor;
    },

    getProcessedCaptureEventName: function() {
        return RunnerEvents.END_TEST;
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
                return [tmpPath, Image.compare(tmpPath, refPath, {
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
                        return Image.buildDiff({
                            reference: refPath,
                            current: currentPath,
                            diff: diffPath,
                            diffColor: _this._diffColor,
                            tolerance: tolerance
                        });
                    }
                };
            });
    }
});
