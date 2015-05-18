'use strict';
var q = require('q'),
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),

    Image = require('./image'),

    GeminiError = require('./errors/gemini-error'),
    clientScriptCalibrate = fs.readFileSync(path.join(__dirname, 'browser', 'client-scripts', 'gemini.calibrate.js'), 'utf8');

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
            var find = ['#00ff00', '#00ff00', '#00ff00', '#ff0000'];

            /**
                * Compare pixel with given x,y to given pixel in the pattern
                * @param {Object} coords
                * @param {Object} positionData position data
                */
            function checkPattern(coords, positionData) {
                if (Image.RGBToString(image.getRGBA(coords.x, coords.y)) === find[positionData.u]) {
                    if (++positionData.u === find.length) {
                        positionData.pos = {x: coords.x - (find.length - 1), y: coords.y};
                        return positionData.pos;
                    }

                    return;
                }

                positionData.u = 0;
            }

            var width = image.getSize().width,
                height = image.getSize().height,
                start = {u: 0};

            outer: for (var y = 0; y < height; y++) {
                for (var x = 0; x < width; x++) {
                    if (checkPattern({x: x, y: y}, start)) {
                        break outer;
                    }
                }
            }

            if (!start.pos) {
                return q.reject(new GeminiError(
                    'Could not calibrate. This could be due to calibration page has failed to open properly'
                ));
            }

            _.extend(features, {
                top: start.pos.y,
                left: start.pos.x
            });

            _this._cache[browser.id] = features;
            return features;
        });
};

/**
 * @typedef {Object} CalibrationResult
 * @property {Number} top
 * @property {Number} left
 * @property {Number} right
 * @property {Number} bottom
 */

module.exports = Calibrator;
