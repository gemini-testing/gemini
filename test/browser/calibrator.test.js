'use strict';

const {eachSupportedBrowser} = require('./util');
const {Calibrator} = require('gemini-core');

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
