'use strict';
var BrowserConfig = require('../../lib/config/browser-config'),
    createSuite = require('../../lib/suite').create;

describe('BrowserConfig', function() {
    function createConfig(options) {
        return new BrowserConfig('id', {}, options);
    }

    describe('getAbsoluteUrl', function() {
        it('should resolve url relative to root', function() {
            var config = createConfig({rootUrl: 'http://example.com/path/'}),
                url = config.getAbsoluteUrl('sub/path');
            assert.equal(url, 'http://example.com/path/sub/path');
        });

        it('should ignore slash at the end of the root', function() {
            var config = createConfig({rootUrl: 'http://example.com/path'}),
                url = config.getAbsoluteUrl('sub/path');
            assert.equal(url, 'http://example.com/path/sub/path');
        });

        it('should ignore slash at the begining of the passed relUrl', function() {
            var config = createConfig({rootUrl: 'http://example.com/path/'}),
                url = config.getAbsoluteUrl('/sub/path');
            assert.equal(url, 'http://example.com/path/sub/path');
        });
    });

    describe('getScreenshotsDir', function() {
        it('should return path for simple suite and state', function() {
            var config = createConfig({screenshotsDir: '/screens'}),
                suite = createSuite('suite'),
                dir = config.getScreenshotsDir(suite, 'state');

            assert.equal(dir, '/screens/suite/state');
        });

        it('should return path for nested suite and state', function() {
            var config = createConfig({screenshotsDir: '/screens'}),
                parent = createSuite('parent'),
                child = createSuite('child', parent),
                dir = config.getScreenshotsDir(child, 'state');

            assert.equal(dir, '/screens/parent/child/state');
        });
    });

    describe('getScreenshotPath', function() {
        it('should return path to the image', function() {
            var config = new BrowserConfig('browser', {}, {
                    screenshotsDir: '/screens'
                }),
                suite = createSuite('suite'),
                path = config.getScreenshotPath(suite, 'state');
            assert.equal(path, '/screens/suite/state/browser.png');
        });
    });
});
