'use strict';

const _ = require('lodash');
const utils = require('./utils');
const {temp, Image} = require('gemini-core');

module.exports = class CaptureProcessor {
    static create() {
        return new CaptureProcessor();
    }

    onReference(handler) {
        this._onRefHandler = handler || _.noop;
        return this;
    }

    onNoReference(handler) {
        this._onNoRefHandler = handler || _.noop;
        return this;
    }

    onEqual(handler) {
        this._onEqualHandler = handler || _.noop;
        return this;
    }

    onDiff(handler) {
        this._onDiffHandler = handler || _.noop;
        return this;
    }

    exec(capture, opts) {
        const referencePath = opts.referencePath;

        return utils.existsRef(referencePath)
            .then((isRefExists) => {
                return isRefExists
                    ? this._onRefHandler(referencePath) || this._compareImages(capture, opts)
                    : this._onNoRefHandler(referencePath, capture);
            });
    }

    _compareImages(capture, opts) {
        const referencePath = opts.referencePath;
        const currentPath = temp.path({suffix: '.png'});
        const compareOpts = {
            canHaveCaret: capture.canHaveCaret,
            tolerance: opts.tolerance,
            pixelRatio: opts.pixelRatio
        };

        return capture.image.save(currentPath)
            .then(() => Image.compare(currentPath, referencePath, compareOpts))
            .then((isEqual) => {
                return isEqual
                    ? this._onEqualHandler(referencePath, currentPath)
                    : this._onDiffHandler(referencePath, currentPath);
            });
    }
};
