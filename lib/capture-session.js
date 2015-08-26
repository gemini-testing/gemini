'use strict';

var util = require('util'),
    q = require('q'),
    inherit = require('inherit'),
    find = require('../lib/find-func').find,
    _ = require('lodash'),
    debug = require('debug'),
    StateError = require('../lib/errors/state-error');

module.exports = inherit({
    __constructor: function(browser) {
        this.browser = browser;
        this._context = {};
        this.log = debug('gemini:capture:' + this.browser.id);
    },

    get browserId() {
        return this.browser.id;
    },

    runHook: function(hook, suite) {
        this.log('run callback', hook);
        var sequence = this.browser.createActionSequence();

        try {
            hook.call(this._context, sequence, find);
        } catch (e) {
            return q.reject(new StateError('Error while executing callback', e));
        }
        return sequence.perform()
            .then(function() {
                suite.addPostActions(sequence.getPostActions());
            });
    },

    capture: function(state, opts) {
        var _this = this;
        opts = _.extend({}, opts, {
            ignoreSelectors: state.ignoreSelectors
        });

        this.log('capture "%s" in %o', state.fullName, this.browser);
        return _this.runHook(state.callback, state.suite)
            .then(function(actions) {
                return _this.browser.prepareScreenshot(state.captureSelectors, opts)
                    .then(function(prepareData) {
                        _this.log('capture data:', prepareData);

                        return _this.browser.captureFullscreenImage().then(function(image) {
                            return [
                                image,
                                _this._getToImageCoordsFunction(image, prepareData),
                                prepareData
                            ];
                        });
                    })
                    .spread(function(image, toImageCoords, prepareData) {
                        var cropArea = toImageCoords(prepareData.captureArea);
                        _this._validateImage(image, cropArea);

                        prepareData.ignoreAreas.forEach(function(area) {
                            image.clear(toImageCoords(area));
                        });
                        return image.crop(cropArea)
                            .then(function(crop) {
                                return {
                                    image: crop,
                                    canHaveCaret: prepareData.canHaveCaret,
                                    coverage: prepareData.coverage
                                };
                            });
                    });
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
        var imageSize = image.getSize();
        if (imageSize.height >= prepareData.documentHeight && imageSize.width >= prepareData.documentWidth) {
            this.log('using page coordinates');
            return function toImageCoords(area) {
                return area;
            };
        }

        this.log('using viewport coordinates');
        var viewportOffset = prepareData.viewportOffset;
        return function toImageCoords(area) {
            return {
                top: area.top - viewportOffset.top,
                left: area.left - viewportOffset.left,
                width: area.width,
                height: area.height
            };
        };
    }
});

function isOutsideOfImage(imageSize, cropArea) {
    return cropArea.top < 0 || cropArea.left < 0 || cropArea.left + cropArea.width > imageSize.width;
}
