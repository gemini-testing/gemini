'use strict';

const fs = require('q-io/fs');
const path = require('path');

const ScreenUpdater = require('./screen-updater');

module.exports = class NewScreenUpdater extends ScreenUpdater {
    _processCapture(capture, opts, isRefExists) {
        if (isRefExists) {
            return false;
        }

        return fs.makeTree(path.dirname(opts.refPath))
            .then(() => capture.image.save(opts.refPath))
            .thenResolve(true);
    }
};
