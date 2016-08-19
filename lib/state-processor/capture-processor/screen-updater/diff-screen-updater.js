'use strict';

const fs = require('q-io/fs');
const q = require('q');

const temp = require('../../../temp');
const Image = require('../../../image');
const ScreenUpdater = require('./screen-updater');

module.exports = class DiffScreenUpdater extends ScreenUpdater {
    _processCapture(capture, opts, isRefExists) {
        if (!isRefExists) {
            return false;
        }

        const referencePath = opts.refPath;
        const currentPath = temp.path({suffix: '.png'});

        return capture.image.save(currentPath)
            .then(() => {
                return Image.compare(currentPath, referencePath, {
                    canHaveCaret: capture.canHaveCaret,
                    tolerance: opts.tolerance,
                    pixelRatio: opts.pixelRatio
                });
            })
            .then((isEqual) => (isEqual ? q() : fs.copy(currentPath, referencePath)).then(!isEqual));
    }
};
