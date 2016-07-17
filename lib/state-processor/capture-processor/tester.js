'use strict';

var q = require('q'),
    fs = require('q-io/fs'),
    _ = require('lodash'),
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
        var referencePath = opts.refPath,
            tmpPath = temp.path({suffix: '.png'});

        return capture.image.save(tmpPath)
            .then(() => fs.exists(referencePath))
            .then(refExists => {
                if (!refExists) {
                    return q.reject(new NoRefImageError(referencePath, tmpPath));
                }
            })
            .then(() => {
                return [tmpPath, Image.compare(tmpPath, referencePath, {
                    canHaveCaret: capture.canHaveCaret,
                    tolerance: opts.tolerance,
                    pixelRatio: opts.pixelRatio
                })];
            })
            .spread((currentPath, equal) => {
                return {referencePath, currentPath, equal};
            });
    }

    postprocessResult(result, opts) {
        return _.extend(result, {
                saveDiffTo: diffPath => {
                    return Image.buildDiff({
                        reference: result.referencePath,
                        current: result.currentPath,
                        diff: diffPath,
                        diffColor: this._diffColor,
                        tolerance: opts.tolerance
                    });
                }
            });
    }
};
