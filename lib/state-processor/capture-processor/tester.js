'use strict';

var q = require('q'),
    fs = require('q-io/fs'),
    temp = require('../../temp'),

    CaptureProcessor = require('./capture-processor'),
    Image = require('../../image'),
    NoRefImageError = require('../../errors/no-ref-image-error');

module.exports = class Tester extends CaptureProcessor {
    static create(diffColor) {
        return new Tester(diffColor);
    }

    constructor(diffColor) {
        super();

        this._diffColor = diffColor;
    }

    exec(capture, opts) {
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
};
