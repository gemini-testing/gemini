'use strict';

const debug = require('debug');
const OffsetImageError = require('../errors/offset-image-error');
const HeightOutsideImageError = require('../errors/height-outside-image-error');

module.exports = class CoordValidator {
    /**
     * @param {Browser} browser session instance
     */
    constructor(browser) {
        this._log = debug('gemini:coord-validator:' + browser.id);
    }

    /**
     * Validates compatibility of image and crop area coordinates
     * @param {Object} viewport
     * @param {Object} cropArea
     * @returns {Object}
     */
    validate(viewport, cropArea) {
        const bottom = cropArea.top + cropArea.height;

        this._log('viewport size', viewport);
        this._log('crop area', cropArea);

        if (isOutsideOfImage(viewport, cropArea)) {
            return this._reportGenericOutsideError();
        }

        if (bottom > viewport.height) {
            return this._reportHeightOutsideError();
        }
    }

    /**
     * Reports error if crop area is outside of image
     * @returns {Object}
     * @private
     */
    _reportGenericOutsideError() {
        this._log('crop area is outside of image');

        const message =
            `Can not capture specified region of the page.
            The size of a region is larger then image, captured by browser
            Check that elements:
             - does not overflows the document
             - does not overflows browser viewport
            Alternatively, you can increase browser window size using
            "setWindowSize" or "windowSize" option in config file.`;

        throw new OffsetImageError(message);
    }

    /**
     * This case is handled specially because of Opera 12 browser.
     * Problem, described in error message occurs there much more often then
     * for other browsers and has different workaround
     * @param {Object} viewport
     * @param {Object} cropArea - crop area
     * @returns {Object}
     * @private
     */
    _reportHeightOutsideError() {
        this._log('crop bottom is outside of image');

        throw new HeightOutsideImageError('crop bottom is outside of image');
    }
};

function isOutsideOfImage(viewport, cropArea) {
    return cropArea.top < 0 || cropArea.left < 0 || cropArea.left + cropArea.width > viewport.width;
}
