'use strict';

const fs = require('fs'),
    yaml = require('js-yaml'),
    _ = require('lodash'),
    GeminiError = require('../errors/gemini-error');

exports.read = (filePath) => {
    filePath = filePath || getDefaultConfig();

    return /\.yml$/.test(filePath)
        ? readYAMLFile(filePath)
        : requireModule(filePath);
};

function getDefaultConfig() {
    var configFile = _.find(fs.readdirSync('./'), function(file) {
            return /^\.gemini(\.conf)?\.(yml|js|json)$/.test(file);
        });

    if (!configFile) {
        throw new GeminiError('No config found');
    }

    return configFile;
}

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
