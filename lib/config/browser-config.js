'use strict';

var path = require('path'),
    _ = require('lodash');

function BrowserConfig(id, browserOptions) {
    this.id = id;
    _.extend(this, browserOptions);
}

BrowserConfig.prototype.getScreenshotsDir = function(suite, state) {
    return path.resolve(this.screenshotsDir, getPathForSuite(suite), state);
};

BrowserConfig.prototype.getScreenshotPath = function(suite, state) {
    return path.join(this.getScreenshotsDir(suite, state), this.id + '.png');
};

BrowserConfig.prototype.getAbsoluteUrl = function(relUrl) {
    return [
        this.rootUrl.replace(/\/$/, ''),
        relUrl.replace(/^\//, '')
    ].join('/');
};

function getPathForSuite(suite) {
    var result = '';
    while (suite) {
        result = path.join(suite.name, result);
        suite = suite.parent;
    }
    return result;
}

module.exports = BrowserConfig;
