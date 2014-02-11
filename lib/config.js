var url = require('url'),
    path = require('path'),
    fs = require('q-io/fs'),
    yaml = require('js-yaml'),
    inherit = require('inherit'),
    DEFAULT_SCREENSHOTS_DIR = 'shooter';

var Config = module.exports = inherit({
    __constructor: function(configPath, configText) {
        var config = yaml.load(configText);
        this.root = path.dirname(configPath);
        this.rootUrl = config.rootUrl;
        this.screenshotsDir = path.resolve(this.root,
            config.screenshotsDir || DEFAULT_SCREENSHOTS_DIR);
    },

    getAbsoluteUrl: function getAbsoluteUrl(relUrl) {
        return url.resolve(this.rootUrl, relUrl);
    },

    getScreenshotsDir: function(name) {
        return path.resolve(this.screenshotsDir, name);
    },

    getScreenshotPath: function getScrenshotPath(name, state) {
        return path.join(this.getScreenshotsDir(name), state + '.png');
    }

}, {
    read: function read(configPath) {
        return fs.read(configPath).then(function(content) {
            return new Config(configPath, content);
        });
    }
});
