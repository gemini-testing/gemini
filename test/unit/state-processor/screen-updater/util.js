'use strict';

var util = require('../../../util'),
    Image = require('../../../../lib/image');

util.makeCaptureStub = function() {
    var suite = util.makeSuiteStub();
    return {
            suite: suite,
            state: util.makeStateStub(suite, {tolerance: 1}),
            browser: util.makeBrowser({}, {
                getScreenshotPath: sinon.stub()
            }),
            image: sinon.createStubInstance(Image)
        };
};

module.exports = util;
