'use strict';

var inherit = require('inherit'),
    fs = require('q-io/fs'),
    CaptureProcessor = require('../capture-processor'),

    RunnerEvents = require('../../constants/runner-events');

module.exports = inherit(CaptureProcessor, {
    __constructor: function(config) {
        this.__base(config, RunnerEvents.CAPTURE);
    },

    processCapture: function(capture) {
        var refPath = capture.browser.config.getScreenshotPath(capture.suite, capture.state.name),
            _this = this;

        return fs.exists(refPath)
            .then(function(isRefExists) {
                return _this._doProcessCapture(capture, refPath, isRefExists);
            })
            .then(function() {
                return _this.getStateData(capture, refPath);
            });
    },

    _doProcessCapture: function() {
        throw new Error('Not implemented');
    }
});
