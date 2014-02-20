'use strict';

var url = require('url'),
    path = require('path'),
    fs = require('q-io/fs'),
    yaml = require('js-yaml'),
    inherit = require('inherit'),
    DEFAULT_SCREENSHOTS_DIR = 'shooter/screens';

var Config = module.exports = inherit({
    __constructor: function(configPath, configText) {
        var config = yaml.load(configText);
        this.root = path.dirname(configPath);
        this.rootUrl = config.rootUrl;
        this.gridUrl = config.gridUrl;
        this.browsers = config.browsers || ['phantomjs'];

        this.screenshotsDir = path.resolve(this.root,
            config.screenshotsDir || DEFAULT_SCREENSHOTS_DIR);
    },

    getAbsoluteUrl: function getAbsoluteUrl(relUrl) {
        return url.resolve(this.rootUrl, relUrl);
    },

    getScreenshotsDir: function(name, state) {
        return path.resolve(this.screenshotsDir, name, state);
    },

    getScreenshotPath: function getScrenshotPath(name, state, browser) {
        return path.join(this.getScreenshotsDir(name, state), browser + '.png');
    }
}, {
    read: function read(configPath) {
        return fs.read(configPath).then(function(content) {
            return new Config(configPath, content);
        });
    }
});
