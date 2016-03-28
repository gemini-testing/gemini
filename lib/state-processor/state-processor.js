'use strict';

var Env = require('./env'),
    inherit = require('inherit'),
    _ = require('lodash');

module.exports = inherit({
    __constructor: function(captureProcessor) {
        this._captureProcessor = captureProcessor;
    },

    getProcessedCaptureEventName: function() {
        return this._captureProcessor.getProcessedCaptureEventName();
    },

    prepare: function(emitter) {
        return this._captureProcessor.prepare(emitter);
    },

    exec: function(state, browserSession, captureOpts) {
        return browserSession.capture(state, captureOpts)
            .then(function(capture) {
                return this._captureProcessor.exec(capture, new Env(state, browserSession))
                    .then(function(processed) {
                        return _.extend(processed, {
                            coverage: capture.coverage
                        });
                    });
            }.bind(this));
    }
});
