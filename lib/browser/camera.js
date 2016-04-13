'use strict';

var Image = require('../image'),
    inherit = require('inherit'),
    q = require('q');

module.exports = inherit({
    __constructor: function(wdRemote) {
        this._wdRemote = wdRemote;
    },

    calibrate: function(calibration) {
        this._calibration = calibration;
    },

    captureFullscreenImage: function() {
        var _this = this;
        return this._tryScreenshotMethod('_takeScreenshot')
            .fail(function(originalError) {
                return _this._tryScreenshotMethod('_takeScreenshotWithNativeContext')
                    .fail(function() {
                        // if _takeScreenshotWithNativeContext fails too, the original error
                        // most likely was not related to the different Appium contexts and
                        // it is more useful to report it instead of second one
                        return q.reject(originalError);
                    });
            });
    },

    _tryScreenshotMethod: function(method) {
        var _this = this;
        return this[method]()
            .then(function(screenshot) {
                _this.captureFullscreenImage = _this[method];
                return screenshot;
            });
    },

    _takeScreenshot: function() {
        var _this = this;
        return this._wdRemote.takeScreenshot()
            .then(function(base64) {
                var image = Image.fromBase64(base64);
                if (_this._calibration) {
                    image = image.crop({
                        left: _this._calibration.left,
                        top: _this._calibration.top,
                        width: image.getSize().width - _this._calibration.left,
                        height: image.getSize().height - _this._calibration.top
                    });
                }

                return image;
            });
    },

    _takeScreenshotWithNativeContext: function() {
        var _this = this;
        return this._wdRemote.currentContext()
            .then(function(oldContext) {
                return _this._wdRemote.context('NATIVE_APP')
                    .then(_this._takeScreenshot.bind(_this))
                    .fin(function() {
                        return _this._wdRemote.context(oldContext);
                    });
            });
    }
});
