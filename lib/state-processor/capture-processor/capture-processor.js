'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
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
        const {refImg} = opts;

        return utils.existsRef(refImg.path)
            .then((isRefExists) => {
                if (isRefExists) {
                    const refImgBase64 = fs.readFileSync(refImg.path);
                    refImg.size = Image.fromBase64(refImgBase64).getSize();
                }

                return isRefExists
                    ? this._onRefHandler(refImg) || this._compareImages(capture, opts)
                    : this._onNoRefHandler(refImg, capture);
            });
    }

    _compareImages(capture, opts) {
        const {refImg} = opts;
        const currImg = {path: temp.path({suffix: '.png'}), size: capture.image.getSize()};
        const compareOpts = {
            canHaveCaret: capture.canHaveCaret,
            pixelRatio: opts.pixelRatio,
            tolerance: opts.tolerance,
            antialiasingTolerance: opts.antialiasingTolerance
        };

        return capture.image.save(currImg.path)
            .then(() => Image.compare(currImg.path, refImg.path, compareOpts))
            .then((isEqual) => {
                return isEqual
                    ? this._onEqualHandler(refImg, currImg)
                    : this._onDiffHandler(refImg, currImg);
            });
    }
};
