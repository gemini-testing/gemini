'use strict';
var path = require('path'),
    configparser = require('gemini-configparser'),
    _ = require('lodash'),
    GeminiError = require('../errors/gemini-error'),
    util = require('./util'),

    browserOptions = require('./browser-options'),

    is = util.is,
    anyObject = util.anyObject,
    resolveWithProjectRoot = util.resolveWithProjectRoot,
    booleanOption = util.booleanOption,
    root = configparser.root,
    section = configparser.section,
    option = configparser.option,
    map = configparser.map;

module.exports = root(
    section(_.extend(browserOptions.getTopLevel(), {
        system: section({
            projectRoot: option({
                validate: is('string'),
                map: _.ary(path.resolve, 1)
            }),

            sourceRoot: option({
                validate: is('string'),
                map: resolveWithProjectRoot,
                defaultValue: function(config) {
                    return config.system.projectRoot;
                }
            }),

            plugins: anyObject(),

            debug: booleanOption(false),

            parallelLimit: option({
                parseEnv: Number,
                parseCli: Number,
                defaultValue: 0,
                validate: function(value) {
                    if (typeof value !== 'number') {
                        throw new GeminiError('Field "parallelLimit" must be an integer number');
                    }

                    if (value < 0) {
                        throw new GeminiError('Field "parallelLimit" must be non-negative');
                    }

                    if (Math.floor(value) !== value) {
                        throw new GeminiError('Field "parallelLimit" must be an integer number');
                    }
                }
            }),

            diffColor: option({
                defaultValue: '#ff00ff',
                validate: function(value) {
                    if (typeof value !== 'string') {
                        throw new GeminiError('Field "diffColor" must be string');
                    }

                    if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
                        throw new GeminiError('Field "diffColor" must be hexadecimal color string (i.e. #ff0000)');
                    }
                }
            }),

            referenceImageAbsence: option({
                defaultValue: 'error',
                validate: function(value) {
                    if (value !== 'error' && value !== 'warning') {
                        throw new GeminiError('Field "referenceImageAbsence" must be "error" or "warning".' +
                            ' Default value is "error"');
                    }
                }
            }),

            sessionMode: option({
                defaultValue: 'perBrowser',
                validate: function(value) {
                    var allowedValues = ['perBrowser', 'perSuite'];
                    if (!_.includes(allowedValues, value)) {
                        throw new GeminiError('Field "sessionMode" must be one of: ' + allowedValues.join(', '));
                    }
                }
            }),

            coverage: section({
                enabled: booleanOption(false),
                exclude: option({
                    defaultValue: [],
                    validate: function(value) {
                        if (!_.isArray(value)) {
                            throw new GeminiError('"coverage.exclude" must be an array');
                        }

                        if (!_.every(value, _.isString)) {
                            throw new GeminiError('"coverage.exclude" must be an array of strings');
                        }
                    }
                }),
                html: booleanOption(true)
            })

        }),

        browsers: map(section(browserOptions.getPerBrowser()))
    }))
);
