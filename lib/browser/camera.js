'use strict';

var Image = require('../image'),
    inherit = require('inherit'),
    q = require('q'),
    _ = require('lodash'),
    util = require('./util');

module.exports = inherit({
    __constructor: function(wdRemote, screenshotMode) {
        this._wdRemote = wdRemote;
        this._screenshotMode = screenshotMode;
    },

    calibrate: function(calibration) {
        this._calibration = calibration;
    },

    captureFullscreenImage: function(pageDisposition) {
        var _this = this;
        return this._tryScreenshotMethod('_takeScreenshot', pageDisposition)
            .fail(function(originalError) {
                return _this._tryScreenshotMethod('_takeScreenshotWithNativeContext', pageDisposition)
                    .fail(function() {
                        // if _takeScreenshotWithNativeContext fails too, the original error
                        // most likely was not related to the different Appium contexts and
                        // it is more useful to report it instead of second one
                        return q.reject(originalError);
                    });
            });
    },

    _tryScreenshotMethod: function(method, pageDisposition) {
        var _this = this;
        return this[method](pageDisposition)
            .then(function(screenshot) {
                _this.captureFullscreenImage = _this[method];
                return screenshot;
            });
    },

    _takeScreenshot: function(pageDisposition) {
        var _this = this;
        return this._wdRemote.takeScreenshot()
            .then(function(base64) {
                var image = Image.fromBase64(base64);
                return _this._applyCalibration(image);
            })
            .then(function(image) {
                return _this._cropToViewport(image, pageDisposition);
            });
    },

    _takeScreenshotWithNativeContext: function(pageDisposition) {
        var _this = this;
        return this._wdRemote.currentContext()
            .then(function(oldContext) {
                return _this._wdRemote.context('NATIVE_APP')
                    .then(_this._takeScreenshot.bind(_this, pageDisposition))
                    .fin(function() {
                        return _this._wdRemote.context(oldContext);
                    });
            });
    },

    _applyCalibration: function(image) {
        if (!this._calibration) {
            return image;
        }

        return image.crop({
            left: this._calibration.left,
            top: this._calibration.top,
            width: image.getSize().width - this._calibration.left,
            height: image.getSize().height - this._calibration.top
        });
    },

    _cropToViewport: function(image, pageDisposition) {
        if (!pageDisposition) {
            return image;
        }

        const isFullPage = util.isFullPage(image, pageDisposition, this._screenshotMode);
        let cropArea = _.clone(pageDisposition.viewport);

        if (this._screenshotMode === 'viewport' || !isFullPage) {
            cropArea = _.extend(cropArea, {
                top: 0,
                left: 0
            });
        }

        return image.crop(cropArea, {scaleFactor: pageDisposition.pixelRatio});
    }
});
