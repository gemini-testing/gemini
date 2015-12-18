'use strict';

var util = require('../../../util'),
    Image = require('../../../../lib/image');

util.makeCaptureStub = function() {
    return {
            suite: util.makeSuiteStub(),
            state: util.makeStateStub({tolerance: 1}),
            browser: util.makeBrowser({}, {
                getScreenshotPath: sinon.stub()
            }),
            image: sinon.createStubInstance(Image)
        };
};

module.exports = util;
