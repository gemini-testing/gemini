'use strict';

var inherit = require('inherit');

module.exports = inherit({
    __constructor: function(config, processedCaptureEvent) {
        this._config = config;
        this._processedCaptureEvent = processedCaptureEvent;
    },

    prepare: function(emitter) {},

    processCapture: function(capture) {
        throw new Error('Not implemented');
    },

    getProcessedCaptureEventName: function() {
        return this._processedCaptureEvent;
    },

    getStateData: function(capture, path) {
        return {
                suite: capture.suite,
                state: capture.state,
                imagePath: path,
                browserId: capture.browser.id
            };
    }
});
