'use strict';

const fs = require('q-io/fs');

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
            .then(() => Image.compare(currentPath, referencePath, {
                canHaveCaret: capture.canHaveCaret,
                tolerance: opts.tolerance,
                pixelRatio: opts.pixelRatio
            }))
            .then((isEqual) => {
                if (isEqual) {
                    return false;
                }

                return fs.copy(currentPath, referencePath).thenReturn(true);
            });
    }
};
