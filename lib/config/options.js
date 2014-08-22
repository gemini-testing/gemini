'use strict';
var path = require('path'),
    yaml = require('js-yaml'),
    chalk = require('chalk'),
    extend = require('node.extend'),

    GeminiError = require('../errors/gemini-error');

function parseLegacyBrowsers(browsers) {
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
}

function warnLegacyBrowsers(parsed)  {
    console.error([
        chalk.yellow('Warning! You are using deprecated format of "browsers" option'),
        chalk.yellow('in gemini config. Replace it\'s value with the following code:'),
        '', yaml.safeDump({browsers: parsed}),
        chalk.yellow('For more info on project configuration see the instructions:'),
        chalk.yellow('https://github.com/bem/gemini#configuration')
    ].join('\n'));
}

function parseBrowsers(browsers) {
    var parsed = {};
    // Convert `browser-id: browser-name` to `browser-id: {browserName: browser-name}`
    Object.keys(browsers).forEach(function(id) {
        if (typeof browsers[id] === 'string') {
            parsed[id] = {browserName: browsers[id]};
        } else {
            parsed[id] = browsers[id];
        }
    });
    return parsed;
}

module.exports = {
    rootUrl: {
        validate: 'string',
        required: true,
        override: true,
        env: 'GEMINI_ROOT_URL'
    },

    gridUrl: {
        validate: 'string',
        override: true,
        env: 'GEMINI_GRID_URL'
    },

    browsers: {
        default: {phantomjs: 'phantomjs'},
        map: function(value) {
            var parsed = {};
            if (Array.isArray(value)) {
                parsed = parseLegacyBrowsers(value);
                warnLegacyBrowsers(parsed);
                return parsed;
            }

            if (typeof value === 'object') {
                return parseBrowsers(value);
            }
            throw new GeminiError('Field "browsers" must be an object or an array (deprecated).',
                'Configure your project by following the instructions:\n\n' +
                'https://github.com/bem/gemini#configuration');
        }
    },

    capabilities: {
        default: {},
        validate: 'object',
        map: function(value) {
            if ('takesScreenshot' in value) {
                throw new GeminiError(
                    'Setting `takesScreenshot` capability for all browsers is not allowed.\n' +
                    'It is required and will be set automatically.'
                );
            }
            return value;
        }
    },

    http: {
        default: {},
        validate: 'object',
        map: function(value) {
            var conf = {};
            ['timeout', 'retries', 'retryDelay']
                .forEach(function(option) {
                    if (option in value) {
                        if (typeof value[option] !== 'number') {
                            throw new GeminiError('Field "http.' + option + '" must be a number');
                        }
                        conf[option] = value[option];
                    }
                });
            return conf;
        }
    },

    debug: {
        default: false,
        override: true,
        env: 'GEMINI_DEBUG',
        map: function(value) {
            if (typeof value === 'boolean') {
                return value;
            } else if (typeof value === 'number') {
                return !!value;
            } else if (typeof value === 'string') {
                switch (value.toLowerCase()) {
                    case '1':
                    case 'yes':
                    case 'true':
                        return true;
                    case '0':
                    case 'no':
                    case 'false':
                        return false;
                }
            }

            throw new GeminiError(
                'Field "debug" must be a boolean value or one of the ' +
                '0, 1, "0", "1", "yes", "no", "true", "false"'
            );
        }
    },

    parallelLimit: {
        default: null,
        map: function(value) {
            if (typeof value !== 'number') {
                throw new GeminiError('Field "parallelLimit" must be an integer number');
            }

            if (value < 0) {
                throw new GeminiError('Field "parallelLimit" must be non-negative');
            }

            if (Math.floor(value) !== value) {
                throw new GeminiError('Field "parallelLimit" must be an integer number');
            }
            return value;
        }
    },

    tolerance: {
        default: Number.MIN_VALUE,
        map: function(value) {
            if (typeof value !== 'number') {
                throw new GeminiError('Field "tolerance" must be a number');
            }

            if (value > 1 || value < 0) {
                throw new GeminiError('Field "tolerance" must be between 0 and 1');
            }
            return value;
        }
    },

    diffColor: {
        default: '#ff00ff',
        map: function(value) {
            if (typeof value !== 'string') {
                throw new GeminiError('Field "diffColor" must be string');
            }

            if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
                throw new GeminiError('Field "diffColor" must be hexadecimal color string (i.e. #ff0000)');
            }
            return value;
        }
    },

    screenshotsDir: {
        default: 'gemini/screens',
        override: true,
        env: 'GEMINI_SCREENSHOTS_DIR',
        map: function(value, config) {
            if (typeof value !== 'string') {
                throw new GeminiError('Field "screenshotsDir" must be string');
            }
            return path.resolve(config.root, value);
        }
    }

};
