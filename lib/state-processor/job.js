'use strict';

const CaptureProcessor = require('./capture-processor');
const CaptureSession = require('../capture-session');
const temp = require('../temp');
const Promise = require('bluebird');

Promise.promisifyAll(require('fs-extra'));

module.exports = (args, cb) => {
    temp.attach(args.temp);

    const captureProcessor = CaptureProcessor.create(args.captureProcessorType);

    return CaptureSession.fromObject(args.browserSession)
        .then((browserSession) => browserSession.capture(args.page))
        .then((capture) => captureProcessor.exec(capture, args.execOpts))
        .then(cb.bind(null, null), cb);
};
