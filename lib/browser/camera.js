'use strict';

const bluebirdQ = require('bluebird-q');
const Image = require('../image');
const Promise = require('bluebird');
const _ = require('lodash');
const util = require('./util');

module.exports = class Camera {
    constructor(wdRemote, screenshotMode) {
        this._wdRemote = wdRemote;
        this._screenshotMode = screenshotMode;
    }

    calibrate(calibration) {
        this._calibration = calibration;
    }

    captureViewportImage(page) {
        return this._tryScreenshotMethod('_takeScreenshot', page)
            .catch((originalError) => {
                return this._tryScreenshotMethod('_takeScreenshotWithNativeContext', page)
                    .catch(() => {
                        // if _takeScreenshotWithNativeContext fails too, the original error
                        // most likely was not related to the different Appium contexts and
                        // it is more useful to report it instead of second one
                        return Promise.reject(originalError);
                    });
            });
    }

    scroll(x, y) {
        return bluebirdQ(this._wdRemote.execute(`window.scrollBy(${x},${y})`));
    }

    _tryScreenshotMethod(method, page) {
        return this[method](page)
            .then((screenshot) => {
                this.captureViewportImage = this[method];
                return screenshot;
            });
    }

    _takeScreenshot(page) {
        return bluebirdQ(this._wdRemote.takeScreenshot())
            .then((base64) => {
                const image = Image.fromBase64(base64);
                return this._applyCalibration(image);
            })
            .then((image) => this._cropToViewport(image, page));
    }

    _takeScreenshotWithNativeContext(page) {
        return bluebirdQ(this._wdRemote.currentContext())
            .then((oldContext) => {
                return bluebirdQ(this._wdRemote.context('NATIVE_APP'))
                    .then(this._takeScreenshot.bind(this, page))
                    .finally(() => bluebirdQ(this._wdRemote.context(oldContext)));
            });
    }

    _applyCalibration(image) {
        if (!this._calibration) {
            return image;
        }

        return image.crop({
            left: this._calibration.left,
            top: this._calibration.top,
            width: image.getSize().width - this._calibration.left,
            height: image.getSize().height - this._calibration.top
        });
    }

    _cropToViewport(image, page) {
        if (!page) {
            return image;
        }

        const isFullPage = util.isFullPage(image, page, this._screenshotMode);
        let cropArea = _.clone(page.viewport);

        if (this._screenshotMode === 'viewport' || !isFullPage) {
            cropArea = _.extend(cropArea, {
                top: 0,
                left: 0
            });
        }

        return image.crop(cropArea, {scaleFactor: page.pixelRatio});
    }
};
