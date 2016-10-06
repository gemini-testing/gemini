'use strict';
var Promise = require('bluebird'),
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),

    GeminiError = require('./errors/gemini-error'),
    looksSame = require('looks-same'),
    clientScriptCalibrate = fs.readFileSync(path.join(__dirname, 'browser', 'client-scripts', 'gemini.calibrate.min.js'), 'utf8'),
    DIRECTION = {FORWARD: 'forward', REVERSE: 'reverse'};

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
        return Promise.resolve(this._cache[browser.id]);
    }
    return browser.open('about:blank', {resetZoom: false})
        .then(function() {
            return browser.evalScript(clientScriptCalibrate);
        })
        .then(function(features) {
            return [features, browser.captureViewportImage()];
        })
        .spread(function(features, image) {
            var innerWidth = features.innerWidth,
                hasPixelRatio = !!(features.pixelRatio && features.pixelRatio > 1.0),
                imageFeatures = _this._analyzeImage(image, {calculateColorLength: hasPixelRatio});

            if (!imageFeatures) {
                return Promise.reject(new GeminiError(
                    'Could not calibrate. This could be due to calibration page has failed to open properly'
                ));
            }

            _.extend(features, {
                top: imageFeatures.viewportStart.y,
                left: imageFeatures.viewportStart.x,
                usePixelRatio: hasPixelRatio && imageFeatures.colorLength > innerWidth
            });

            _this._cache[browser.id] = features;
            return features;
        });
};

Calibrator.prototype._analyzeImage = function(image, params) {
    var imageHeight = image.getSize().height;

    for (var y = 0; y < imageHeight; y++) {
        var result = analyzeRow(y, image, params);

        if (result) {
            return result;
        }
    }

    return null;
};

function analyzeRow(row, image, params) {
    params = params || {};

    var markerStart = findMarkerInRow(row, image, DIRECTION.FORWARD);

    if (markerStart === -1) {
        return null;
    }

    if (!params.calculateColorLength) {
        return {viewportStart: {x: markerStart, y: row}};
    }

    var markerEnd = findMarkerInRow(row, image, DIRECTION.REVERSE),
        colorLength = markerEnd - markerStart + 1;

    return {viewportStart: {x: markerStart, y: row}, colorLength: colorLength};
}

function findMarkerInRow(row, image, searchDirection) {
    var imageWidth = image.getSize().width,
        searchColor = {R: 148, G: 250, B: 0};

    if (searchDirection === DIRECTION.REVERSE) {
        return searchReverse_();
    } else {
        return searchForward_();
    }

    function searchForward_() {
        for (var x = 0; x < imageWidth; x++) {
            if (compare_(x)) {
                return x;
            }
        }
        return -1;
    }

    function searchReverse_() {
        for (var x = imageWidth - 1; x >= 0; x--) {
            if (compare_(x)) {
                return x;
            }
        }
        return -1;
    }

    function compare_(x) {
        var color = pickRGB(image.getRGBA(x, row));
        return looksSame.colors(color, searchColor);
    }
}

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
