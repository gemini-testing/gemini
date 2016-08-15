'use strict';

var q = require('q'),
    fs = require('q-io/fs'),
    _ = require('lodash'),
    temp = require('../../temp'),

    CaptureProcessor = require('./capture-processor'),
    Image = require('../../image'),
    NoRefImageError = require('../../errors/no-ref-image-error');

module.exports = class Tester extends CaptureProcessor {
    static create() {
        return new Tester();
    }

    exec(capture, opts) {
        var referencePath = opts.refPath,
            currentPath = temp.path({suffix: '.png'});

        return capture.image.save(currentPath)
            .then(() => fs.exists(referencePath))
            .then(refExists => {
                if (!refExists) {
                    return q.reject(new NoRefImageError(referencePath, currentPath));
                }
            })
            .then(() => Image.compare(currentPath, referencePath, {
                canHaveCaret: capture.canHaveCaret,
                tolerance: opts.tolerance,
                pixelRatio: opts.pixelRatio
            }))
            .then((equal) => ({referencePath, currentPath, equal}));
    }
};
