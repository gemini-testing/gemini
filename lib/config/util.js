'use strict';
var path = require('path'),
    configparser = require('gemini-configparser'),
    GeminiError = require('../errors/gemini-error'),
    option = configparser.option,
    map = configparser.map;

function is(type) {
    return function(value) {
        if (typeof value !== type) {
            throw new GeminiError('a value must be ' + type);
        }
    };
}

function resolveWithProjectRoot(value, config) {
    return path.resolve(config.system.projectRoot, value);
}

function booleanOption(defaultValue) {
    return option({
        parseCli: parseBoolean,
        parseEnv: parseBoolean,
        validate: is('boolean'),
        defaultValue: defaultValue
    });
}

function parseBoolean(value) {
    switch (value.toLowerCase()) {
        case '1':
        case 'yes':
        case 'true':
            return true;
        case '0':
        case 'no':
        case 'false':
            return false;
        default:
            throw new GeminiError('Unexpected value for boolean option ' + value);
    }
}

function anyObject() {
    return map(option({}));
}

exports.is = is;
exports.resolveWithProjectRoot = resolveWithProjectRoot;
exports.anyObject = anyObject;
exports.booleanOption = booleanOption;
