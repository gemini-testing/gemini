'use strict';
var q = require('q'),
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),

    GeminiError = require('./errors/gemini-error'),
    looksSame = require('looks-same'),
    clientScriptCalibrate = fs.readFileSync(path.join(__dirname, 'browser', 'client-scripts', 'gemini.calibrate.min.js'), 'utf8'),
    MIN_COLOR_LENGTH = 6;

/**
 * @constructor
 */
function Calibrator() {
    this._cache = {};
}

/**
 * @param {Browser} browser
 * @returns {Promise.<CalibrationResult>}
 */
Calibrator.prototype.calibrate = function(browser) {
    var _this = this;
    if (this._cache[browser.id]) {
        return q(this._cache[browser.id]);
    }
    return browser.open('about:blank')
        .then(function() {
            return browser.evalScript(clientScriptCalibrate);
        })
        .then(function(features) {
            return [features, browser.captureFullscreenImage()];
        })
        .spread(function(features, image) {
            var imageFeatures = _this._detectImageFeatures(image);

            if (!imageFeatures) {
                return q.reject(new GeminiError(
                    'Could not calibrate. This could be due to calibration page has failed to open properly'
                ));
            }

            _.extend(features, {
                top: imageFeatures.viewportStart.y,
                left: imageFeatures.viewportStart.x,
                usePixelRatio: (features.pixelRatio &&
                    features.pixelRatio > 1.0 &&
                    imageFeatures.colorLength > MIN_COLOR_LENGTH
                )
            });

            _this._cache[browser.id] = features;
            return features;
        });
};

Calibrator.prototype._detectImageFeatures = function(image) {
    var searchColor = {R: 148, G: 250, B: 0},
        imageSize = image.getSize(),
        start = null,
        currentLength = 0;

    for (var y = 0; y < imageSize.height; y++) {
        for (var x = 0; x < imageSize.width; x++) {
            var color = pickRGB(image.getRGBA(x, y));
            if (looksSame.colors(color, searchColor)) {
                currentLength++;
                if (!start) {
                    start = {x: x, y: y};
                }
            } else if (currentLength >= MIN_COLOR_LENGTH) {
                return {viewportStart: start, colorLength: currentLength};
            } else {
                currentLength = 0;
                start = null;
            }
        }
    }

    if (!start) {
        return null;
    }

    return {viewportStart: start, colorLength: currentLength};
};

function pickRGB(rgba) {
    return {
        R: rgba.r,
        G: rgba.g,
        B: rgba.b
    };
}

/**
 * @typedef {Object} CalibrationResult
 * @property {Number} top
 * @property {Number} left
 * @property {Number} right
 * @property {Number} bottom
 */

module.exports = Calibrator;
