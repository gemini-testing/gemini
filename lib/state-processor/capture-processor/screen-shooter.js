'use strict';

var fs = require('q-io/fs'),
    inherit = require('inherit'),
    CaptureProcessor = require('./capture-processor'),

    RunnerEvents = require('../../constants/runner-events');

module.exports = inherit(CaptureProcessor, {
    getProcessedCaptureEventName: function() {
        return RunnerEvents.CAPTURE;
    },

    exec: function(capture, env) {
        var savePath = env.refPath;

        //TODO: create directories only once
        return fs.makeTree(env.refsDir)
            .then(function() {
                return capture.image.save(savePath);
            })
            .thenResolve({imagePath: savePath});
    }
});
