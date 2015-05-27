'use strict';
var eachSupportedBrowser = require('./util').eachSupportedBrowser,
    Calibrator = require('../../lib/calibrator'),
    assert = require('chai').assert;

describe('calibrator', function() {
    eachSupportedBrowser(function() {
        beforeEach(function() {
            return this.browser.initSession();
        });

        afterEach(function() {
            return this.browser.quit();
        });

        it('should not fail', function() {
            var calibrator = new Calibrator();
            return assert.isFulfilled(calibrator.calibrate(this.browser));
        });
    });
});
