'use strict';

const CaptureSession = require('../capture-session');
const temp = require('../temp');
const Promise = require('bluebird');

Promise.promisifyAll(require('fs-extra'));

module.exports = (args, cb) => {
    temp.attach(args.temp);

    const captureProcessor = require(args.captureProcessorInfo.module)
        .create(args.captureProcessorInfo.constructorArg);

    return CaptureSession.fromObject(args.browserSession)
        .then(browserSession => browserSession.capture(args.page))
        .then(capture => captureProcessor.exec(capture, args.execOpts))
        .then(cb.bind(null, null), cb);
};
