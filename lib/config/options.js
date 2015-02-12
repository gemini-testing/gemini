'use strict';
var path = require('path'),

    GeminiError = require('../errors/gemini-error');

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

function validateBoolean(field) {
    return function(value) {
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
            'Field "' + field + '" must be a boolean value or one of the ' +
            '0, 1, "0", "1", "yes", "no", "true", "false"'
        );
    };
}

module.exports = {
    projectRoot: {
        validate: 'string',
        required: true
    },
    sourceRoot: {
        validate: 'string',
        required: false,
        override: true,
        env: 'GEMINI_SOURCE_ROOT',
        default: function(config) {
            return config.projectRoot;
        },
        map: function(value, config) {
            return path.resolve(config.projectRoot, value);
        }
    },
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
        validate: 'object',
        map: function(value) {
            if (Array.isArray(value)) {
                throw new GeminiError(
                    'Legacy browsers definition is not supported since v0.8.0',
                    'Upgrade to modern one: https://github.com/bem/gemini#configuration'
                );
            }
            return parseBrowsers(value);
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

    coverageExclude: {
        default: [],
        map: function(value) {
            if (Array.isArray(value)) {
                return value;
            }

            throw new GeminiError('Field "coverageExclude" must be an array value');
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
        map: validateBoolean('debug')
    },

    parallelLimit: {
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
        validate: 'number',
        default: 2.3
    },

    strictComparison: {
        validate: 'boolean',
        default: false
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
            return path.resolve(config.projectRoot, value);
        }
    },

    coverage: {
        default: false,
        override: true,
        env: 'GEMINI_COVERAGE',
        map: validateBoolean('coverage')
    },

    coverageNoHtml: {
        default: false,
        override: true,
        env: 'GEMINI_COVERAGE_NO_HTML',
        map: validateBoolean('coverageNoHtml')
    },

    windowSize: {
        env: 'GEMINI_WINDOW_SIZE',
        map: function(value, config) {
            if (typeof value !== 'string' || !/^\d+x\d+$/.test(value)) {
                throw new GeminiError('Field "windowSize" must be string (i.e. 1600x1200)');
            }

            var size = value.split('x');

            return {
                width: parseInt(size[0]),
                height: parseInt(size[1])
            };
        }
    }

};
