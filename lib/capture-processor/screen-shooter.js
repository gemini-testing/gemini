'use strict';

var fs = require('q-io/fs'),
    inherit = require('inherit'),
    CaptureProcessor = require('./capture-processor'),

    RunnerEvents = require('../constants/runner-events');

module.exports = inherit(CaptureProcessor, {
    __constructor: function(config) {
        this.__base(config, RunnerEvents.CAPTURE);
    },

    processCapture: function(capture) {
        var _this = this,
            browserConfig = capture.browser.config,
            savePath = browserConfig.getScreenshotPath(capture.suite, capture.state.name);

        //TODO: create directories only once
        return fs.makeTree(browserConfig.getScreenshotsDir(capture.suite, capture.state.name))
            .then(function() {
                return capture.image.save(savePath);
            })
            .then(function() {
                var data = {
                    suite: capture.suite,
                    state: capture.state,
                    imagePath: savePath,
                    browserId: capture.browser.id
                };
                _this.emit(RunnerEvents.CAPTURE, data);
                return data;
            });
    }

});
