'use strict';

var fs = require('q-io/fs'),
    inherit = require('inherit'),
    StateProcessor = require('./state-processor'),

    RunnerEvents = require('../constants/runner-events');

module.exports = inherit(StateProcessor, {
    __constructor: function(config) {
        this.__base(config, RunnerEvents.CAPTURE);
    },

    processCapture: function(capture) {
        var browserConfig = capture.browser.config,
            savePath = browserConfig.getScreenshotPath(capture.suite, capture.state.name);

        //TODO: create directories only once
        return fs.makeTree(browserConfig.getScreenshotsDir(capture.suite, capture.state.name))
            .then(function() {
                return capture.image.save(savePath);
            })
            .then(function() {
                return this.getStateData(capture, savePath);
            }.bind(this));
    }
});
