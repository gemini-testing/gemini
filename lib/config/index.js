'use strict';

var url = require('url'),
    path = require('path'),
    format = require('util').format,
    fs = require('fs'),
    yaml = require('js-yaml'),
    inherit = require('inherit'),
    GeminiError = require('../errors/gemini-error'),

    options = require('./options');

module.exports = inherit({
    __constructor: function(configData, cliOptions) {
        var filePath;
        if (typeof configData === 'string') {
            filePath = configData;
            configData = readConfigData(filePath);
        }

        //this.projectRoot should be assigned before any options parsing
        //has taken place
        if (!configData.projectRoot) {
            throw new GeminiError('Field "projectRoot" is required when creating config programmatically');
        }
        this.projectRoot = path.resolve(configData.projectRoot);
        this._checkForUnknownOptions(configData);
        cliOptions = cliOptions || {};

        Object.keys(options).forEach(function(property) {
            if (this[property]) {
                return;
            }
            var option = options[property],
                value;
            if (option.env && option.env in process.env) {
                value = process.env[option.env];
            } else if (option.override && property in cliOptions) {
                value = cliOptions[property];
            } else if (property in configData) {
                value = configData[property];
            } else if (option.default) {
                value = option.default;
            } else if (option.required) {
                var message = format('Field "%s" is not specified', property);
                if (filePath) {
                    message += ' in config file '  + filePath;
                }

                throw new GeminiError(
                    message,
                    format('Specify "%s" field', property)
                );
            }

            if (typeof value === 'undefined') {
                return;
            }

            if (option.validate) {
                if (typeof value !== option.validate) {
                    throw new GeminiError(format('Field "%s" must be %s', property, option.validate));
                }
            }

            if (option.map) {
                value = option.map(value, this);
            }

            this[property] = value;
        }, this);

        this._checkGridUrl();
    },

    _checkForUnknownOptions: function(configData) {
        Object.keys(configData).forEach(function(property) {
            if (!options.hasOwnProperty(property)) {
                throw new GeminiError(
                    format('Unknown config option: "%s"', property),
                    'List of the valid options:\n' +
                    'https://github.com/bem/gemini#configuration'
                );
            }
        });
    },

    _checkGridUrl: function() {
        if (!this.gridUrl && this._requiresGrid()) {
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
    },

    _requiresGrid: function() {
        return Object.keys(this.browsers).some(function(name) {
            return this.browsers[name].browserName !== 'phantomjs';
        }, this);
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

});

function readConfigData(filePath) {
    var configData = readYAMLFile(filePath),
        configDir = path.dirname(filePath);
    if (configData.projectRoot) {
        configData.projectRoot = path.resolve(configDir, configData.projectRoot);
    } else {
        configData.projectRoot = configDir;
    }
    return configData;
}

function readYAMLFile(configPath) {
    var text = readFile(configPath);
    return parseYAML(text, configPath);
}

function readFile(configPath) {
    try {
        return fs.readFileSync(configPath, 'utf8');
    } catch (e) {
        if (e.code === 'ENOENT') {
            throw new GeminiError(
                'Config file does not exist: ' + configPath,
                'Specify config file or configure your project by following\nthe instructions:\n\n' +
                'https://github.com/bem/gemini#configuration'
            );
        }
        throw e;
    }
}

function parseYAML(source, filename) {
    try {
        return yaml.safeLoad(source);
    } catch (e) {
        throw new GeminiError('Error while parsing a config file: ' + filename + '\n' +
            e.reason + ' ' + e.mark,
            'Gemini config should be valid YAML file.'
        );
    }
}
