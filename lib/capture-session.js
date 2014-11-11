'use strict';

var util = require('util'),
    q = require('q'),
    inherit = require('inherit'),
    find = require('../lib/find-func').find,
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
        return sequence.perform();
    },

    capture: function(state, opts) {
        var _this = this;
        return _this.runHook(state.callback)
            .then(function() {
                return _this.browser.prepareScreenshot(state.captureSelectors, opts);
            })
            .then(function(data) {
                return _this.browser.captureFullscreenImage().then(function(image) {
                    return [image, _this._getCropRect(image, data), data];
                });
            })
            .spread(function(image, cropRect, data) {
                return image.crop(cropRect)
                    .then(function(crop) {
                        return {
                            image: crop,
                            canHaveCaret: data.canHaveCaret,
                            coverage: data.coverage
                        };
                    });
            });
    },

    _getCropRect: function(image, pageData) {
        var imageSize = image.getSize(),
            size = pageData.cropSize,
            location = pageData.locationInBody;

        if (imageSize.height < pageData.bodyHeight) {
            location = pageData.locationInViewport;
        }

        if (location.top + size.height > imageSize.height) {
            // This case is handled specially because of Opera 12 browser.
            // Problem, described in error message occurs there much more often then
            // for other browsers and has different workaround
            return q.reject(new StateError(util.format(
                'Failed to capture the element because it is positioned outside of the captured body. ' +
                'Most probably you are trying to capture an absolute positioned element which does not make body ' +
                'height to expand. To fix this place a tall enough <div> on the page to make body expand.\n' +
                'Element position: %s, %s; size: %s, %s. Page screenshot size: %s, %s. ',
                location.left, location.top, size.width, size.height, imageSize.width, imageSize.height)));
        }

        if (isOutsideOfImage(location, size, imageSize)) {
            return q.reject(new StateError(
                'Can not capture specified region of the page\n' +
                'The size of a region is larger then image, captured by browser\n' +
                'Check that elements:\n' +
                ' - does not overflows the body element\n' +
                ' - does not overflows browser viewport\n ' +
                'Alternatively, you can increase browser window size using\n' +
                '"setWindowSize" or "windowSize" option in config file.'

            ));
        }

        return {
            top: location.top,
            left: location.left,
            width: size.width,
            height: size.height
        };
    }

});

function isOutsideOfImage(location, size, imageSize) {
    return location.top < 0 || location.left < 0 || location.left + size.width > imageSize.width;
}
