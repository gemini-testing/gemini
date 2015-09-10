'use strict';
var Config = require('../../lib/config'),
    Browser = require('../../lib/browser'),
    _ = require('lodash'),

    supportedBrowsers = {
        // evergreen browsers are always tested against latest
        // version
        chrome: {
            browserName: 'chrome'
        },

        firefox: {
            browserName: 'firefox'
        },

        // Some specific versions we support
        ie8: {
            browserName: 'internet explorer',
            version: '8'
        },

        ie9: {
            browserName: 'internet explorer',
            version: '9'
        },

        ie10: {
            browserName: 'internet explorer',
            version: '10'
        },

        ie11: {
            browserName: 'internet explorer',
            version: '11'
        },

        opera12: {
            browserName: 'opera',
            version: '12'
        },

        'android4.4': {
            browserName: 'android',
            version: '4.4',
            platform: 'Linux',
            device: 'Android Emulator',
            deviceOrientation: 'portrait'
        }
    },

    testsConfig = new Config({
        gridUrl: 'http://ondemand.saucelabs.com/wd/hub',
        rootUrl: 'http://example.com',
        browsers: _.mapValues(supportedBrowsers, function(capabilities) {
            return {desiredCapabilities: capabilities};
        }),
        system: {
            projectRoot: process.cwd()
        }
    }),
    browserDescribe;

if (process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {
    browserDescribe = describe;
} else {
    browserDescribe = describe.skip;
    console.warn('WARNING: Sauce labs is not set up.');
    console.warn('Some functional tests will be skipped.');
    console.warn('To fix:');
    console.warn('1. Create account at https://saucelabs.com/opensauce/');
    console.warn('2. Set SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables');
}

exports.eachSupportedBrowser = function(cb) {
    Object.keys(supportedBrowsers).forEach(function(browserId) {
        browserDescribe('in ' + browserId, function() {
            beforeEach(function() {
                var browserConfig = testsConfig.forBrowser(browserId);
                this.browser = new Browser(browserConfig);
            });

            cb();
        });
    });
};
