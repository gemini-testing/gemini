'use strict';

var path = require('path'),
    fs = require('fs'),
    yaml = require('js-yaml'),
    _ = require('lodash'),
    GeminiError = require('../errors/gemini-error'),
    BrowserConfig = require('./browser-config'),

    parseOptions = require('./options');

/**
 * @param {Object|String} configData data of the config or path to file
 * @param {Object} allowOverrides
 * @param {Boolean} allowOverrides.env
 * @param {Boolean} allowOverrides.cli
 */
function Config(configData, allowOverrides) {
    allowOverrides = _.defaults(allowOverrides || {}, {
        env: false,
        cli: false
    });

    var env = allowOverrides.env? process.env : {},
        argv = allowOverrides.cli? process.argv : [];

    if (_.isString(configData)) {
        configData = readConfigData(configData);
    }

    var parsed = parseOptions({
        options: configData,
        env: env,
        argv: argv
    });

    this.system = parsed.system;
    this.sets = parsed.sets;

    var travisJobNumber = process.env.TRAVIS_JOB_NUMBER,
        travisBuildNumber = process.env.TRAVIS_BUILD_NUMBER;

    if (travisJobNumber && travisBuildNumber) {
        _.forOwn(parsed.browsers, function(browserOptions) {
            var gridUrl = browserOptions.gridUrl;
            if (gridUrl && gridUrl.indexOf('saucelabs.com') > -1) {
                var desiredCapabilities = browserOptions.desiredCapabilities;
                desiredCapabilities['tunnel-identifier'] = travisJobNumber;
                desiredCapabilities.build = travisBuildNumber;
            }
        });
    }

    this._configs = _.mapValues(parsed.browsers, function(data, id) {
        return new BrowserConfig(id, this.system, data);
    }.bind(this));
}

Config.prototype.forBrowser = function(id) {
    return this._configs[id];
};

Config.prototype.getBrowserIds = function() {
    return Object.keys(this._configs);
};

Config.prototype.isCoverageEnabled = function() {
    return this.system.coverage.enabled;
};

function readConfigData(filePath) {
    var configData = readYAMLFile(filePath),
        configDir = path.dirname(filePath);
    if (_.has(configData, 'system.projectRoot')) {
        configData.system.projectRoot = path.resolve(configDir, configData.system.projectRoot);
    } else {
        _.set(configData, 'system.projectRoot', configDir);
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

module.exports = Config;
