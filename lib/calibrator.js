'use strict';
var q = require('q'),
    fs = require('fs'),
    path = require('path'),

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
            return browser.inject(clientScriptCalibrate);
        })
        .then(function() {
            return browser.captureFullscreenImage();
        })
        .then(function(image) {
            var find = ['#00ff00', '#00ff00', '#00ff00', '#ff0000'];

            /**
                * Compare pixel with given x,y to given pixel in the pattern
                * @param {Object} coords
                * @param {Object} positionData position data
                * @param [Boolean] reverse should be true when traversing x from right to left
                */
            function checkPattern(coords, positionData, reverse) {
                if (Image.RGBToString(image.getRGBA(coords.x, coords.y)) === find[positionData.u]) {
                    if (++positionData.u === find.length) {
                        positionData.pos = {x: coords.x - (reverse? -1 : 1) * (find.length - 1), y: coords.y};
                    }

                    return;
                }

                positionData.u = 0;
            }

            var width = image.getSize().width,
                height = image.getSize().height,
                start = {u: 0},
                end = {u: 0};

            for (var y = 0; y < height && (!start.pos || !end.pos); y++) {
                for (var x = 0; x < width; x++) {
                    if (!start.pos) {
                        checkPattern({x: x, y: y}, start);
                    }
                    if (!end.pos) {
                        checkPattern({x: width - x - 1, y: height - y - 1}, end, true);
                    }
                }
            }

            if (!start.pos || !end.pos) {
                return q.reject(new GeminiError(
                    'Could not calibrate. This could be due to calibration page has failed to open properly'
                ));
            }

            var calibration = {
                top: start.pos.y,
                left: start.pos.x,
                right: width - 1 - end.pos.x,
                bottom: height - 1 - end.pos.y
            };

            _this._cache[browser.id] = calibration;
            return calibration;
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
