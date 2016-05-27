'use strict';

const IdentityTransformer = require('./identity-transformer');
const MoveTransformer = require('./move-transformer');
const ScaleTransformer = require('./scale-transformer');

module.exports = class Transformer {
    /**
     * @param {Browser} browser session instance
     * @param {boolean} browser.usePixelRatio
     * @param {Object} browser.config - gemini configuration for browser
     * @param {String} browser.config.screenshotMode - capture mode ('auto' by default)
     * @constructor
     */
    constructor(browser) {
        this._usePixelRatio = browser.usePixelRatio;
        this._screenshotMode = browser.config.screenshotMode;
    }

    /**
     * Creates transformer
     * @param {Image} image - captured image
     * @param {Object} pageDisposition - capture meta-information
     * @returns {IdentityTransformer|MoveTransformer|ScaleTransformer}
     */
    create(image, pageDisposition) {
        let transformer = IdentityTransformer.create();

        if (!this._shouldUsePageCoords(image, pageDisposition)) {
            transformer = MoveTransformer.create(transformer, pageDisposition.viewportOffset);
        }

        pageDisposition.pixelRatio = pageDisposition.pixelRatio || 1;

        if (this._usePixelRatio && pageDisposition.pixelRatio !== 1) {
            transformer = ScaleTransformer.create(transformer, pageDisposition.pixelRatio);
        }

        return transformer;
    }

    /**
     * Determines to use page coordinates or not depending on
     * screenshotMode options field and image dimensions comparison
     * @param {Image} image - PngImg wrapper
     * @param {Object} pageDisposition - capture meta information object
     * @returns {boolean}
     * @private
     */
    _shouldUsePageCoords(image, pageDisposition) {
        switch (this._screenshotMode) {
            case 'fullpage': return true;
            case 'viewport': return false;
            case 'auto': return this._compareDimensions(image, pageDisposition);
        }
    }

    /**
     * @param {Image} image - PngImg wrapper
     * @param {Object} pageDisposition - capture meta information object
     * @returns {boolean}
     * @private
     */
    _compareDimensions(image, pageDisposition) {
        const documentWidth = this._scaleDocumentDimension(pageDisposition.documentWidth, pageDisposition.pixelRatio);
        const documentHeight = this._scaleDocumentDimension(pageDisposition.documentHeight, pageDisposition.pixelRatio);
        const imageSize = image.getSize();

        return imageSize.height >= documentHeight && imageSize.width >= documentWidth;
    }

    /**
     * Scales given dimension depending on configuration
     * @param {Number} dimension - image dimension
     * @param {Number} pixelRatio - pixel ration multiplier
     * @returns {Number}
     * @private
     */
    _scaleDocumentDimension(dimension, pixelRatio) {
        return this._usePixelRatio
            ? dimension * pixelRatio
            : dimension;
    }
};
