'use strict';
var eachSupportedBrowser = require('./util').eachSupportedBrowser,
    Calibrator = require('../../lib/calibrator'),
    assert = require('chai').assert;

describe('calibrator', function() {
    eachSupportedBrowser(function() {
        beforeEach(function() {
            this.timeout(30000);
            return this.browser.initSession();
        });

        afterEach(function() {
            this.timeout(10000);
            return this.browser.quit();
        });

        it('should not fail', function() {
            this.timeout(10000);
            var calibrator = new Calibrator();
            return assert.isFulfilled(calibrator.calibrate(this.browser));
        });
    });
});
