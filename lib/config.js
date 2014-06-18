'use strict';

var url = require('url'),
    path = require('path'),
    fs = require('q-io/fs'),
    yaml = require('js-yaml'),
    chalk = require('chalk'),
    extend = require('node.extend'),
    inherit = require('inherit'),
    GeminiError = require('./errors/gemini-error'),

    DEFAULT_SCREENSHOTS_DIR = 'gemini/screens';

var Config = module.exports = inherit({
    __constructor: function(configPath, configText, overrides) {
        overrides = overrides || {};
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
        this.rootUrl = overrides.rootUrl || config.rootUrl;

        if (!this.rootUrl) {
            throw new GeminiError(
                'Required field "rootUrl" is not specified in config file: ' + configPath,
                '"rootUrl" should point to the root of website under test.\nSuite URLs are resolved relative to it.'
            );
        }
        this.gridUrl = overrides.gridUrl || config.gridUrl;
        this.browsers = this._parseBrowsers(config.browsers || {phantomjs: 'phantomjs'});
        this.capabilities = config.capabilities || {};
        this._validateCapabilities();

        this.http = this._parseHttp(config.http || {});

        if ('debug' in config && typeof config.debug !== 'boolean') {
            throw new GeminiError('Field "debug" must contain a boolean value');
        }
        this.debug = !!config.debug;

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
        return Object.keys(this.browsers).some(function(name) {
            return this.browsers[name].browserName !== 'phantomjs';
        }, this);
    },

    _validateCapabilities: function() {
        if ('takesScreenshot' in this.capabilities) {
            throw new GeminiError(
                'Setting `takesScreenshot` capability for all browsers is not allowed.\n' +
                'It is required and will be set automatically.'
            );
        }
    },

    _parseBrowsers: function(browsers) {
        var parsedBrowsers = {};
        // legacy browsers config
        if (Array.isArray(browsers)) {
            // Convert legacy browsers config value to the current one
            parsedBrowsers = this._parseLegacyBrowsers(browsers);

            // legacy browsers config option warning
            console.error([
                chalk.yellow('Warning! You are using deprecated format of "browsers" option'),
                chalk.yellow('in gemini config. Replace it\'s value with the following code:'),
                '', yaml.safeDump({browsers: parsedBrowsers}),
                chalk.yellow('For more info on project configuration see the instructions:'),
                chalk.yellow('https://github.com/bem/gemini#configuration')
            ].join('\n'));

            return parsedBrowsers;
        } else if (browsers !== null && typeof browsers === 'object') {
            // Convert `browser-id: browser-name` to `browser-id: {browserName: browser-name}`
            Object.keys(browsers).forEach(function(id) {
                if (typeof browsers[id] === 'string') {
                    parsedBrowsers[id] = {browserName: browsers[id]};
                } else {
                    parsedBrowsers[id] = browsers[id];
                }
            }, this);
            return parsedBrowsers;
        }
        throw new GeminiError('Field "browsers" must be an object or an array (deprecated).',
            'Configure your project by following the instructions:\n\n',
            'https://github.com/bem/gemini#configuration');
    },

    _parseLegacyBrowsers: function(browsers) {
        var parsedBrowsers = {};

        browsers
            .map(function(browser) {
                if (typeof browser === 'string') {
                    return {browserName: browser};
                }
                if ('name' in browser) {
                    browser = extend(true, {}, browser);
                    browser.browserName = browser.name;
                    delete browser.name;
                }
                return browser;
            })
            .forEach(function(browser) {
                var id = browser.browserName;
                if (browser.version) {
                    id += '-v' + browser.version;
                }
                parsedBrowsers[id] = browser;
            });

        return parsedBrowsers;
    },

    _parseHttp: function(http) {
        var conf = {};
        ['timeout', 'retries', 'retryDelay']
            .forEach(function(option) {
                if (option in http) {
                    if (typeof http[option] !== 'number') {
                        throw new GeminiError('Field "http.' + option + '" must be a number');
                    }
                    conf[option] = http[option];
                }
            });
        return conf;
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
    }

}, {
    read: function read(configPath, overrides) {
        return fs.read(configPath)
            .then(function(content) {
                return new Config(configPath, content, overrides);
            })
            .fail(function(e) {
                if (e.code === 'ENOENT') {
                    throw new GeminiError(
                        'Config file does not exists: ' + configPath,
                        'Specify config file or configure your project by following\nthe instructions:\n\n' +
                        'https://github.com/bem/gemini#configuration'
                    );
                }
                throw e;
            });
    }
});
