'use strict';

var fs = require('q-io/fs'),
    path = require('path'),
    inherit = require('inherit'),
    CaptureProcessor = require('./capture-processor'),

    RunnerEvents = require('../../constants/runner-events');

module.exports = inherit(CaptureProcessor, {
    getProcessedCaptureEventName: function() {
        return RunnerEvents.CAPTURE;
    },

    exec: function(capture, opts) {
        var savePath = opts.refPath;

        //TODO: create directories only once
        return fs.makeTree(path.dirname(savePath))
            .then(function() {
                return capture.image.save(savePath);
            })
            .thenResolve({imagePath: savePath});
    }
});
