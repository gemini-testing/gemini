'use strict';

var util = require('util'),
    inherit = require('inherit'),
    _ = require('lodash'),
    logger = require('./utils').logger,
    debug = require('debug'),
    promiseUtil = require('q-promise-utils'),
    ActionsBuilder = require('./tests-api/actions-builder'),
    StateError = require('./errors/state-error'),
    Browser = require('./browser'),
    temp = require('./temp');

var CaptureSession = inherit({
    __constructor: function(browser) {
        this.browser = browser;
        this.log = debug('gemini:capture:' + this.browser.id);
        this._postActions = [];
    },

    runActions: function(actions) {
        this.log('run actions');
        return promiseUtil.sequence(actions, this.browser, new ActionsBuilder(this._postActions));
    },

    prepareScreenshot: function(state, opts) {
        opts = _.extend({}, opts, {
            ignoreSelectors: state.ignoreSelectors
        });

        this.log('capture "%s" in %o', state.fullName, this.browser);
        return this.browser.prepareScreenshot(state.captureSelectors, opts);
    },

    capture: function(pageDisposition) {
        return this.browser.captureFullscreenImage()
            .then(function(screenImage) {
                return this._cropImage(screenImage, pageDisposition);
            }.bind(this));
    },

    runPostActions: function() {
        return promiseUtil.sequence(this._postActions.reverse(), this.browser);
    },

    extendWithPageScreenshot: function(obj) {
        var path = temp.path({suffix: '.png'});

        return this.browser.captureFullscreenImage()
            .then(function(screenImage) {
                return screenImage.save(path);
            })
            .then(function() {
                obj.imagePath = path;
            })
            .fail(_.noop)
            .thenResolve(obj);
    },

    serialize: function() {
        return {
            browser: this.browser.serialize()
        };
    },

    _cropImage: function(screenImage, pageDisposition) {
        this.log('capture data:', pageDisposition);

        var toImageCoords = this._getToImageCoordsFunction(screenImage, pageDisposition),
            cropArea = toImageCoords(pageDisposition.captureArea);

        try {
            this._validateImage(screenImage, cropArea);
        } catch (err) {
            logger.error(err.message);
            return {image: screenImage};
        }

        pageDisposition.ignoreAreas.forEach(function(area) {
            screenImage.clear(toImageCoords(area));
        });
        return screenImage.crop(cropArea)
            .then(function(crop) {
                return {
                    image: crop,
                    canHaveCaret: pageDisposition.canHaveCaret,
                    coverage: pageDisposition.coverage
                };
            });
    },

    _validateImage: function(image, cropArea) {
        var imageSize = image.getSize(),
            bottom = cropArea.top + cropArea.height;
        this.log('image size', imageSize);
        this.log('crop area', cropArea);
        if (bottom > imageSize.height) {
            this.log('crop bottom is outside of image');
            // This case is handled specially because of Opera 12 browser.
            // Problem, described in error message occurs there much more often then
            // for other browsers and has different workaround
            throw new StateError(util.format(
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
            ));
        }

        if (isOutsideOfImage(imageSize, cropArea)) {
            this.log('crop area is outside of image');
            throw new StateError(
                'Can not capture specified region of the page\n' +
                'The size of a region is larger then image, captured by browser\n' +
                'Check that elements:\n' +
                ' - does not overflows the document\n' +
                ' - does not overflows browser viewport\n ' +
                'Alternatively, you can increase browser window size using\n' +
                '"setWindowSize" or "windowSize" option in config file.'

            );
        }
    },

    _getToImageCoordsFunction: function(image, prepareData) {
        var scaleCoords = this._getCoordsScaleFunction(prepareData);
        if (this._shouldUsePageCoords(image, prepareData)) {
            this.log('using page coordinates');
            return function toImageCoords(area) {
                return scaleCoords(area);
            };
        }

        this.log('using viewport coordinates');
        var viewportOffset = prepareData.viewportOffset;
        return function toImageCoords(area) {
            return scaleCoords({
                top: area.top - viewportOffset.top,
                left: area.left - viewportOffset.left,
                width: area.width,
                height: area.height
            });
        };
    },

    _getCoordsScaleFunction: function(prepareData) {
        if (this.browser.usePixelRatio && !_.isUndefined(prepareData.pixelRatio)) {
            this.log('coordinates will be scaled by %d', prepareData.pixelRatio);
            return function(area) {
                return {
                    top: area.top * prepareData.pixelRatio,
                    left: area.left * prepareData.pixelRatio,
                    width: area.width * prepareData.pixelRatio,
                    height: area.height * prepareData.pixelRatio
                };
            };
        }

        this.log('coordinates will not be scaled');
        return _.identity;
    },

    _shouldUsePageCoords: function(image, prepareData) {
        var documentWidth = this._scaleDocumentDimension(prepareData.documentWidth, prepareData.pixelRatio),
            documentHeight = this._scaleDocumentDimension(prepareData.documentHeight, prepareData.pixelRatio),
            imageSize = image.getSize();

        return imageSize.height >= documentHeight && imageSize.width >= documentWidth;
    },

    _scaleDocumentDimension: function(dimension, pixelRatio) {
        return this.browser.usePixelRatio
            ? dimension * pixelRatio
            : dimension;
    }
}, {
    fromObject: function(serializedSession) {
        return Browser.fromObject(serializedSession.browser)
            .then(function(browser) {
                return new CaptureSession(browser);
            });
    }
});

module.exports = CaptureSession;

function isOutsideOfImage(imageSize, cropArea) {
    return cropArea.top < 0 || cropArea.left < 0 || cropArea.left + cropArea.width > imageSize.width;
}
