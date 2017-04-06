'use strict';

const Promise = require('bluebird');
const fs = require('fs-extra');

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
            .then(() => {
                return fs.accessAsync(referencePath)
                    .catch(
                        () => Promise.reject(new NoRefImageError(referencePath, currentPath))
                    );
            })
            .then(() => Image.compare(currentPath, referencePath, {
                ignoreCaret: capture.canHaveCaret,
                tolerance: opts.tolerance,
                pixelRatio: opts.pixelRatio,
                ignoreAntialiasing: true
            }))
            .then((equal) => ({referencePath, currentPath, equal}));
    }
};
