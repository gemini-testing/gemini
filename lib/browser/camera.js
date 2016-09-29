'use strict';

var Image = require('../image'),
    inherit = require('inherit'),
    q = require('bluebird-q'),
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

    captureViewportImage: function(page) {
        var _this = this;
        return this._tryScreenshotMethod('_takeScreenshot', page)
            .catch(function(originalError) {
                return _this._tryScreenshotMethod('_takeScreenshotWithNativeContext', page)
                    .catch(function() {
                        // if _takeScreenshotWithNativeContext fails too, the original error
                        // most likely was not related to the different Appium contexts and
                        // it is more useful to report it instead of second one
                        return q.reject(originalError);
                    });
            });
    },

    scroll: function(x, y) {
        return this._wdRemote.execute(`window.scrollBy(${x},${y})`);
    },

    _tryScreenshotMethod: function(method, page) {
        var _this = this;
        return this[method](page)
            .then(function(screenshot) {
                _this.captureViewportImage = _this[method];
                return screenshot;
            });
    },

    _takeScreenshot: function(page) {
        var _this = this;
        return this._wdRemote.takeScreenshot()
            .then(function(base64) {
                var image = Image.fromBase64(base64);
                return _this._applyCalibration(image);
            })
            .then(function(image) {
                return _this._cropToViewport(image, page);
            });
    },

    _takeScreenshotWithNativeContext: function(page) {
        var _this = this;
        return this._wdRemote.currentContext()
            .then(function(oldContext) {
                return _this._wdRemote.context('NATIVE_APP')
                    .then(_this._takeScreenshot.bind(_this, page))
                    .finally(function() {
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

    _cropToViewport: function(image, page) {
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
});
