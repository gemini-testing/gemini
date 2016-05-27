'use strict';

const util = require('util');
const q = require('q');
const debug = require('debug');
const StateError = require('../errors/state-error');
const temp = require('../temp');

module.exports = class CoordValidator {
    /**
     * @param {Browser} browser session instance
     */
    constructor(browser) {
        this._log = debug('gemini:coord-validator:' + browser.id);
    }

    /**
     * Validates compatibility of image and crop area coordinates
     * @param {Image} image - captured image
     * @param {Object} cropArea
     * @returns {Promise<StateError|undefined>}
     */
    validate(image, cropArea) {
        const imageSize = image.getSize();
        const bottom = cropArea.top + cropArea.height;

        this._log('image size', imageSize);
        this._log('crop area', cropArea);

        if (bottom > imageSize.height) {
            return this._reportHeightOutsideError(image, cropArea);
        }

        if (isOutsideOfImage(imageSize, cropArea)) {
            return this._reportGenericOutsideError(image);
        }

        return q();
    }

    /**
     * Reports error if crop area is outside of image
     * @param image - captured image
     * @returns {Promise<StateError>}
     * @private
     */
    _reportGenericOutsideError(image) {
        this._log('crop area is outside of image');
        return this._reportError(
            'Can not capture specified region of the page\n' +
            'The size of a region is larger then image, captured by browser\n' +
            'Check that elements:\n' +
            ' - does not overflows the document\n' +
            ' - does not overflows browser viewport\n ' +
            'Alternatively, you can increase browser window size using\n' +
            '"setWindowSize" or "windowSize" option in config file.',
            image
        );
    }

    /**
     * This case is handled specially because of Opera 12 browser.
     * Problem, described in error message occurs there much more often then
     * for other browsers and has different workaround
     * @param {Image} image - captured image
     * @param {Object} cropArea - crop area
     * @returns {Promise<StateError>}
     * @private
     */
    _reportHeightOutsideError(image, cropArea) {
        const imageSize = image.getSize();
        this._log('crop bottom is outside of image');

        return this._reportError(util.format(
            'Failed to capture the element because it is positioned outside of the captured body. ' +
            'Most probably you are trying to capture an absolute positioned element which does not make body ' +
            'height to expand. To fix this place a tall enough <div> on the page to make body expand.\n' +
            'Element position: %s, %s; size: %s, %s. Page screenshot size: %s, %s. ',
            cropArea.left,
            cropArea.top,
            cropArea.width,
            cropArea.height,
            imageSize.width,
            imageSize.height
        ), image);
    }

    _reportError(message, image) {
        const path = temp.path({suffix: '.png'});
        const error = new StateError(message);

        return image.save(path)
            .then(() => error.imagePath = path)
            .thenReject(error);
    }
};

function isOutsideOfImage(imageSize, cropArea) {
    return cropArea.top < 0 || cropArea.left < 0 || cropArea.left + cropArea.width > imageSize.width;
}
