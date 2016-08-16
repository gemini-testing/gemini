'use strict';

var fs = require('q-io/fs'),
    temp = require('../../../temp'),

    Image = require('../../../image'),
    ScreenUpdater = require('./screen-updater');

module.exports = class DiffScreenUpdater extends ScreenUpdater {
    _processCapture(capture, opts, isRefExists) {
        if (!isRefExists) {
            return false;
        }

        var referencePath = opts.refPath,
            currentPath = temp.path({suffix: '.png'});

        return capture.image.save(currentPath)
            .then(() => Image.compare(currentPath, referencePath, {
                canHaveCaret: capture.canHaveCaret,
                tolerance: opts.tolerance,
                pixelRatio: opts.pixelRatio
            }))
            .then((isEqual) => {
                if (!isEqual) {
                    fs.copy(currentPath, referencePath);
                }

                return !isEqual;
            });
    }
};
