'use strict';

var url = require('url'),
    path = require('path'),
    fs = require('q-io/fs'),
    yaml = require('js-yaml'),
    inherit = require('inherit'),
    GeminiError = require('./errors/gemini-error'),

    DEFAULT_SCREENSHOTS_DIR = 'gemini/screens';

var Config = module.exports = inherit({
    __constructor: function(configPath, configText) {
        var config;
        try {
            config = yaml.load(configText);
        } catch (e) {
            throw new GeminiError('Error while parsing a config file: ' + configPath + '\n' +
                    e.reason + ' ' + e.mark,
                    'Gemini config should be valid YAML file.'
            );
        }
        this.root = path.dirname(configPath);
        this.rootUrl = config.rootUrl;

        if (!this.rootUrl) {
            throw new GeminiError(
                'Required field "rootUrl" is not specified in config file: ' + configPath,
                '"rootUrl" should point to the root of website under test.\nPlans URLs are resolved relative to it.'
            );
        }
        this.gridUrl = config.gridUrl;
        this.browsers = this._parseBrowsers(config.browsers || ['phantomjs']);

        if (this._requiresGrid() && !this.gridUrl) {
            throw new GeminiError(
                'Field "gridUrl" is required for using non-phantomjs browsers',
                [
                    'Specify selenium grid URL in your config file or use only',
                    'phantomjs browser.',
                    'Selenium server installation instructions:',
                    '',
                    'https://code.google.com/p/selenium/wiki/Grid2'
                ].join('\n')
            );
        }

        this.screenshotsDir = path.resolve(this.root,
            config.screenshotsDir || DEFAULT_SCREENSHOTS_DIR);
    },

    _requiresGrid: function() {
        return this.browsers.some(function(browser) {
            return  browser !== 'phantomjs';
        });
    },

    _parseBrowsers: function(browsers) {
        return browsers.map(function(browser) {
            if (typeof browser === 'string') {
                return {name: browser};
            }
            return browser;
        });
    },

    getAbsoluteUrl: function getAbsoluteUrl(relUrl) {
        return url.resolve(this.rootUrl, relUrl);
    },

    getScreenshotsDir: function(suite, state) {
        return path.resolve(this.screenshotsDir, this._getPathForSuite(suite), state);
    },

    getScreenshotPath: function getScrenshotPath(suite, state, browser) {
        return path.join(this.getScreenshotsDir(suite, state), browser + '.png');
    },

    _getPathForSuite: function(suite) {
        var result = '';
        while (suite) {
            result = path.join(suite.name, result);
            suite = suite.parent;
        }
        return result;
    },

}, {
    read: function read(configPath) {
        return fs.read(configPath)
            .then(function(content) {
                return new Config(configPath, content);
            })
            .fail(function(e) {
                if (e.code === 'ENOENT') {
                    throw new GeminiError(
                        'Config file does not exists: ' + configPath,
                        'Specify config file or configure your project by following\nthe instructions:\n\n' +
                        'https://github.com/SevInf/gemini#configuration'
                    );
                }
                throw e;
            });
    }
});
