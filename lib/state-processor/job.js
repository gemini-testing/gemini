'use strict';

var CaptureSession = require('../capture-session'),
    _ = require('lodash');

module.exports = function(args) {
    var captureProcessor = require(args.captureProcessorInfo.module)
            .create(args.captureProcessorInfo.constructorArg);

    return CaptureSession.fromObject(args.browserSession)
        .then(function(browserSession) {
            return browserSession.capture(args.pageDisposition);
        })
        .then(function(capture) {
            return captureProcessor.exec(capture, args.execOpts)
                .then(function(processed) {
                    return _.extend(processed, {
                        coverage: capture.coverage
                    });
                });
        });
};
