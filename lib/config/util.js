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

exports.assertNonNegative = (value, optName) => {
    is('number')(value);
    if (value < 0) {
        throw new GeminiError(`"${optName}" must be non-negative`);
    }
};

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

function parsePrimitive(str) {
    let value;

    try {
        value = JSON.parse(str);
    } catch (error) {
        // do nothing
    }

    return value;
}

function positiveIntegerOption(defaultValue) {
    return option({
        parseEnv: Number,
        parseCli: Number,
        defaultValue: defaultValue,
        validate: function(value) {
            if (typeof value !== 'number') {
                throw new GeminiError('Field must be an integer number');
            }

            if (value <= 0) {
                throw new GeminiError('Field  must be positive');
            }

            if (Math.floor(value) !== value) {
                throw new GeminiError('Field must be an integer number');
            }
        }
    });
}

function anyObject() {
    return map(option({
        parseEnv: parsePrimitive,
        parseCli: parsePrimitive
    }));
}

exports.is = is;
exports.resolveWithProjectRoot = resolveWithProjectRoot;
exports.anyObject = anyObject;
exports.booleanOption = booleanOption;
exports.positiveIntegerOption = positiveIntegerOption;
