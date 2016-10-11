'use strict';

const fs = require('fs-extra');
const path = require('path');

const ScreenUpdater = require('./screen-updater');

module.exports = class NewScreenUpdater extends ScreenUpdater {
    _processCapture(capture, opts, isRefExists) {
        if (isRefExists) {
            return false;
        }

        return fs.mkdirsAsync(path.dirname(opts.refPath))
            .then(() => capture.image.save(opts.refPath))
            .thenReturn(true);
    }
};
