'use strict';

var q = require('q'),
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
    
    capture: function(state, context) {
        var _this = this;
        return _this.runHook(state.callback)
            .then(function() {
                return _this.browser.prepareScreenshot(state.captureSelectors);
            })
            .then(function(data) {
                return _this.browser.captureFullscreenImage().then(function(image) {
                    return [image, _this._getCropRect(image, data)];
                });
            })
            .spread(function(image, cropRect) {
                return image.crop(cropRect);
            })
            .fail(function(e) {
                if (e instanceof StateError) {
                    //extend error with metadata
                    e.suiteName = state.suite.name;
                    e.stateName = state.name;
                    e.browserId = _this.browserId;
                }
                return q.reject(e);
            });
    },

    
    _getCropRect: function(image, pageData) {
        return image.getSize()
            .then(function(imageSize) {
                var size = pageData.cropSize,
                    location = pageData.locationInBody;
                if (imageSize.height < pageData.bodyHeight) {
                    location = pageData.locationInViewport;
                }
                return {
                    top: location.top,
                    left: location.left,
                    width: size.width,
                    height: size.height
                };
            });
    },

});
