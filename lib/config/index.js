'use strict';

var path = require('path'),
    _ = require('lodash'),
    BrowserConfig = require('./browser-config'),
    configReader = require('./config-reader'),

    parseOptions = require('./options');

const log = require('debug')('gemini:config');

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

    var env = allowOverrides.env ? process.env : {},
        argv = allowOverrides.cli ? process.argv : [];

    if (!config || _.isString(config)) {
        config = readConfig(config);
    }

    var parsed = parseOptions({
        options: config,
        env: env,
        argv: argv
    });

    log(JSON.stringify(parsed, null, 4));

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

Config.readRawConfig = readConfig;

function readConfig(filePath) {
    var config = configReader.read(filePath),
        configDir = filePath ? path.dirname(filePath) : process.cwd();

    if (_.has(config, 'system.projectRoot')) {
        config.system.projectRoot = path.resolve(configDir, config.system.projectRoot);
    } else {
        _.set(config, 'system.projectRoot', configDir);
    }
    return config;
}

module.exports = Config;
