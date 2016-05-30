'use strict';

const debug = require('debug');

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

        if (bottom > viewport.height) {
            return this._reportHeightOutsideError(viewport, cropArea);
        }

        if (isOutsideOfImage(viewport, cropArea)) {
            return this._reportGenericOutsideError();
        }

        return {failed: false};
    }

    /**
     * Reports error if crop area is outside of image
     * @returns {Object}
     * @private
     */
    _reportGenericOutsideError() {
        this._log('crop area is outside of image');

        const message =
            `Can not capture specified region of the page
            The size of a region is larger then image, captured by browser
            Check that elements:
             - does not overflows the document
             - does not overflows browser viewport
            Alternatively, you can increase browser window size using
            "setWindowSize" or "windowSize" option in config file.`;

        return {
            failed: true,
            message
        };
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
    _reportHeightOutsideError(viewport, cropArea) {
        this._log('crop bottom is outside of image');

        const message = `Failed to capture the element because it is positioned outside of the captured body.
            Most probably you are trying to capture an absolute positioned element which does not make body
            height to expand. To fix this place a tall enough <div> on the page to make body expand.
            Element position: ${cropArea.left}, ${cropArea.top}; size: ${cropArea.width}, ${cropArea.height}.
            Page screenshot size: ${viewport.width}, ${viewport.height}.`;

        return {
            failed: true,
            message
        };
    }
};

function isOutsideOfImage(viewport, cropArea) {
    return cropArea.top < 0 || cropArea.left < 0 || cropArea.left + cropArea.width > viewport.width;
}
