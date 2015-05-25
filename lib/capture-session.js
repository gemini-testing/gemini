'use strict';

var util = require('util'),
    q = require('q'),
    inherit = require('inherit'),
    find = require('../lib/find-func').find,
    _ = require('lodash'),
    StateError = require('../lib/errors/state-error');

module.exports = inherit({
    __constructor: function(browser) {
        this.browser = browser;
        this._context = {};
    },

    get browserId() {
        return this.browser.id;
    },

    runHook: function(hook) {
        var sequence = this.browser.createActionSequence();

        try {
            hook.call(this._context, sequence, find);
        } catch (e) {
            return q.reject(new StateError('Error while executing callback', e));
        }
        return sequence.perform().thenResolve(sequence);
    },

    capture: function(state, opts) {
        var _this = this;
        opts = _.extend({}, opts, {
            ignoreSelectors: state.ignoreSelectors
        });

        return _this.runHook(state.callback)
            .then(function(actions) {
                return _this.browser.prepareScreenshot(state.captureSelectors, opts)
                    .then(function(prepareData) {
                        return _this.browser.captureFullscreenImage().then(function(image) {
                            _this._validateImage(image, prepareData);
                            return [
                                image,
                                getToImageCoordsFunction(image, prepareData),
                                prepareData
                            ];
                        });
                    })
                    .spread(function(image, toImageCoords, prepareData) {
                        prepareData.ignoreAreas.forEach(function(area) {
                            image.clear(toImageCoords(area));
                        });
                        return image.crop(toImageCoords(prepareData.captureArea))
                            .then(function(crop) {
                                return {
                                    image: crop,
                                    canHaveCaret: prepareData.canHaveCaret,
                                    coverage: prepareData.coverage
                                };
                            });
                    })
                    .then(function(data) {
                        return actions.performPostActions().thenResolve(data);
                    });
            });
    },

    _validateImage: function(image, prepareData) {
        var imageSize = image.getSize(),
            captureArea = prepareData.captureArea,
            bottomBorder = captureArea.top + captureArea.height;

        if (imageSize.height < prepareData.documentHeight) {
            bottomBorder -= prepareData.viewportOffset.top;
        }

        if (bottomBorder > imageSize.height) {
            // This case is handled specially because of Opera 12 browser.
            // Problem, described in error message occurs there much more often then
            // for other browsers and has different workaround
            throw new StateError(util.format(
                'Failed to capture the element because it is positioned outside of the captured body. ' +
                'Most probably you are trying to capture an absolute positioned element which does not make body ' +
                'height to expand. To fix this place a tall enough <div> on the page to make body expand.\n' +
                'Element position: %s, %s; size: %s, %s. Page screenshot size: %s, %s. ',
                captureArea.left,
                captureArea.top,
                captureArea.width,
                captureArea.height,
                imageSize.width,
                imageSize.height
            ));
        }

        if (isOutsideOfImage(prepareData, imageSize)) {
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
    }

});

function isOutsideOfImage(data, imageSize) {
    var area = data.captureArea,
        scrollPos = 0;

    if (imageSize.width < data.documentWidth) {
        scrollPos = data.viewportOffset.left;
    }

    return area.top < 0 || area.left < 0 || area.left + area.width - scrollPos > imageSize.width;
}

function getToImageCoordsFunction(image, prepareData) {
    if (image.getSize().height >= prepareData.documentHeight) {
        return function toImageCoords(area) {
            return area;
        };
    }

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
