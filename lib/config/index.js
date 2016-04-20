'use strict';

var path = require('path'),
    fs = require('fs'),
    yaml = require('js-yaml'),
    _ = require('lodash'),
    GeminiError = require('../errors/gemini-error'),
    BrowserConfig = require('./browser-config'),

    parseOptions = require('./options');

/**
 * @param {Object|String} config config object or path to config file
 * @param {Object} allowOverrides
 * @param {Boolean} allowOverrides.env
 * @param {Boolean} allowOverrides.cli
 */
function Config(config, allowOverrides) {
    allowOverrides = _.defaults(allowOverrides || {}, {
        env: false,
        cli: false
    });

    var env = allowOverrides.env? process.env : {},
        argv = allowOverrides.cli? process.argv : [];

    if (!config || _.isString(config)) {
        config = readConfig(config);
    }

    var parsed = parseOptions({
        options: config,
        env: env,
        argv: argv
    });

    this.system = parsed.system;
    this.sets = parsed.sets;
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

function readConfig(filePath) {
    filePath = filePath || getDefaultConfig();

    var config = /\.yml$/.test(filePath)? readYAMLFile(filePath) : requireModule(filePath),
        configDir = path.dirname(filePath);

    if (_.has(config, 'system.projectRoot')) {
        config.system.projectRoot = path.resolve(configDir, config.system.projectRoot);
    } else {
        _.set(config, 'system.projectRoot', configDir);
    }
    return config;
}

function getDefaultConfig() {
    var configFile = _.find(fs.readdirSync('./'), function(file) {
            return /^\.gemini(\.conf)?\.(yml|js|json)$/.test(file);
        });

    if (!configFile) {
        throw new GeminiError('No config found');
    }

    // Add absolute path to config (otherwise we will look for a package named `.gemini.js`)
    configFile = path.resolve(configFile);

    return configFile;
}
Config.getDefaultConfig = getDefaultConfig;

function requireModule(file) {
    try {
        return require(file);
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            throw new GeminiError('Config file does not exist: ' + file);
        }
        throw e;
    }
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
