'use strict';

const _ = require('lodash');
const url = require('url');

const option = require('gemini-configparser').option;
const GeminiError = require('../errors/gemini-error');
const util = require('./util');

const assertNonNegative = util.assertNonNegative;
const booleanOption = util.booleanOption;
const is = util.is;
const positiveIntegerOption = util.positiveIntegerOption;
const resolveWithProjectRoot = util.resolveWithProjectRoot;

const isOptionalObject = (value) => value === null || _.isPlainObject(value);

const getTopLevel = () => {
    const defaults = {
        gridUrl: 'http://localhost:4444/wd/hub',
        calibrate: true,
        httpTimeout: 'default',
        sessionRequestTimeout: null,
        sessionQuitTimeout: null,
        screenshotsDir: 'gemini/screens',
        tolerance: 1.7,
        sessionsPerBrowser: 1,
        suitesPerSession: Infinity,
        windowSize: null,
        retry: 0,
        screenshotMode: 'auto',
        compositeImage: false
    };

    const provideDefault = (key) => defaults[key];

    return buildBrowserOptions(provideDefault, {
        desiredCapabilities: option({
            defaultValue: null,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: (value) => {
                if (!isOptionalObject(value)) {
                    throw new GeminiError('Top-level desiredCapabilities should be null or object');
                }
            }
        })
    });
};

const provideTopLevelDefault = (name) => {
    return (config) => {
        const value = config[name];

        if (_.isUndefined(value)) {
            throw new GeminiError(`${name} should be set at top level or per-browser option`);
        }

        return value;
    };
};

const getPerBrowser = () => {
    return buildBrowserOptions(provideTopLevelDefault, {
        desiredCapabilities: option({
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            defaultValue: null,
            validate: (value, config) => {
                if (value === null && config.desiredCapabilities === null) {
                    throw new GeminiError('Browser must have desired capabilities set');
                } else if (!isOptionalObject(value)) {
                    throw new GeminiError('desiredCapabilities should be null or object');
                }
            },
            map: (value, config) => _.extend({}, config.desiredCapabilities, value)
        })
    });
};

const parseTimeout = (value) => value === 'default' ? value : +value;

function buildBrowserOptions(defaultFactory, extra) {
    return _.extend(extra, {
        rootUrl: option({
            validate: is('string'),
            defaultValue: defaultFactory('rootUrl'),
            map: (value, config) => {
                return config.rootUrl && !value.match(/^https?:\/\//)
                    ? url.resolve(config.rootUrl, value.replace(/^\//, ''))
                    : value;
            }
        }),

        gridUrl: option({
            validate: is('string'),
            defaultValue: defaultFactory('gridUrl')
        }),

        calibrate: booleanOption(defaultFactory('calibrate')),

        httpTimeout: option({
            parseEnv: parseTimeout,
            parseCli: parseTimeout,
            validate: (value) => {
                if (value === 'default') {
                    return;
                }
                assertNonNegative(value, 'httpTimeout');
            },
            defaultValue: defaultFactory('httpTimeout')
        }),

        sessionRequestTimeout: option({
            parseEnv: Number,
            parseCli: Number,
            validate: (value) => {
                if (_.isNull(value)) {
                    return;
                }
                assertNonNegative(value, 'sessionRequestTimeout');
            },
            defaultValue: defaultFactory('sessionRequestTimeout')
        }),

        sessionQuitTimeout: option({
            parseEnv: Number,
            parseCli: Number,
            validate: (value) => {
                if (_.isNull(value)) {
                    return;
                }
                assertNonNegative(value, 'sessionQuitTimeout');
            },
            defaultValue: defaultFactory('sessionQuitTimeout')
        }),

        screenshotsDir: option({
            validate: is('string'),
            defaultValue: defaultFactory('screenshotsDir'),
            map: resolveWithProjectRoot
        }),

        tolerance: option({
            defaultValue: defaultFactory('tolerance'),
            parseEnv: Number,
            parseCli: Number,
            validate: is('number')
        }),

        windowSize: option({
            defaultValue: defaultFactory('windowSize'),
            validate: (value) => {
                if (_.isObject(value) && _.isNumber(value.width) && _.isNumber(value.height)) {
                    return;
                } else if (value === null) {
                    //null is valid value for this option, skip any other checks
                    return;
                } else if (!_.isString(value)) {
                    throw new GeminiError('"windowSize" must be string or null');
                } else if (!/^\d+x\d+$/.test(value)) {
                    throw new GeminiError('"windowSize" should have form of <width>x<height> (i.e. 1600x1200)');
                }
            },

            map: (value) => {
                if (value === null) {
                    return null;
                } else if (_.isObject(value)) {
                    // object with "width" and "height" numeric properties
                    // which does not needs mapping. Any other object won't
                    // pass validation.
                    return value;
                }

                const size = value.split('x');

                return {
                    width: parseInt(size[0], 10),
                    height: parseInt(size[1], 10)
                };
            }
        }),

        sessionsPerBrowser: positiveIntegerOption(defaultFactory('sessionsPerBrowser')),
        suitesPerSession: positiveIntegerOption(defaultFactory('suitesPerSession')),

        retry: option({
            defaultValue: defaultFactory('retry'),
            parseEnv: Number,
            parseCli: Number,
            validate: (value) => {
                is('number')(value);
                if (value < 0) {
                    throw new GeminiError('"retry" must be non-negative');
                }
            }
        }),

        screenshotMode: option({
            defaultValue: defaultFactory('screenshotMode'),
            validate: (value) => {
                is('string')(value);
                if (!_.includes(['fullpage', 'viewport', 'auto'], value)) {
                    throw new GeminiError('"screenshotMode" must be one of "fullpage", "viewport" or "auto"');
                }
            }
        }),

        compositeImage: booleanOption(defaultFactory('compositeImage'))
    });
}

exports.getTopLevel = getTopLevel;
exports.getPerBrowser = getPerBrowser;
