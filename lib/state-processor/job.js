'use strict';

var CaptureSession = require('../capture-session'),
    temp = require('../temp');

module.exports = function(args, cb) {
    temp.attach(args.temp);

    var captureProcessor = require(args.captureProcessorInfo.module)
            .create(args.captureProcessorInfo.constructorArg);

    return CaptureSession.fromObject(args.browserSession)
        .then(browserSession => browserSession.capture(args.page))
        .then(capture => captureProcessor.exec(capture, args.execOpts))
        .then(cb.bind(null, null), cb);
};
