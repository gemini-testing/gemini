'use strict';

var path = require('path'),
    url = require('url'),
    _ = require('lodash');

function BrowserConfig(id, systemOptions, browserOptions) {
    this.id = id;
    this.system = systemOptions;
    _.extend(this, browserOptions);
}

BrowserConfig.prototype.getScreenshotsDir = function(suite, state) {
    return path.resolve(this.screenshotsDir, getPathForSuite(suite), state);
};

BrowserConfig.prototype.getScreenshotPath = function(suite, state) {
    return path.join(this.getScreenshotsDir(suite, state), this.id + '.png');
};

BrowserConfig.prototype.getAbsoluteUrl = function(relUrl) {
    const rootUrl = this.rootUrl.endsWith('/') ? this.rootUrl : `${this.rootUrl}/`;
    return url.resolve(rootUrl, relUrl);
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
