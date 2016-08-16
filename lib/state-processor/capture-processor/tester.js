'use strict';

const q = require('q');
const fs = require('q-io/fs');

const temp = require('../../temp');
const CaptureProcessor = require('./capture-processor');
const Image = require('../../image');
const NoRefImageError = require('../../errors/no-ref-image-error');

module.exports = class Tester extends CaptureProcessor {
    static create() {
        return new Tester();
    }

    exec(capture, opts) {
        const referencePath = opts.refPath;
        const currentPath = temp.path({suffix: '.png'});

        return capture.image.save(currentPath)
            .then(() => fs.exists(referencePath))
            .then((refExists) => {
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
