'use strict';
var _ = require('lodash'),
    GeminiError = require('../errors/gemini-error'),
    chalk = require('chalk'),

    util = require('util');

var REMOVED_OPTIONS_REPLACEMENTS = {
    '--source-root': '--system-source-root',
    '--debug': '--system-debug=true',
    '--coverage': '--system-coverage-enabled=true',
    '--coverage-no-html': '--system-coverage-html=false'
};

var REMOVED_ENV_REPLACEMENTS = {
    'GEMINI_SOURCE_ROOT': 'gemini_system_source_root',
    'GEMINI_DEBUG': 'gemini_system_debug',
    'GEMINI_COVERAGE': 'gemini_system_coverage_enabled',
    'GEMINI_COVERAGE_NO_HTML': 'gemini_system_coverage_html',
    'GEMINI_GRID_URL': 'gemini_grid_url',
    'GEMINI_ROOT_URL': 'gemini_root_url',
    'GEMINI_WINDOW_SIZE': 'gemini_window_size'
};

exports.checkForDeprecations = function() {
    checkForRemovedOptions();
    checkForRemovedEnvVars();
};

function checkForRemovedOptions() {
    _.forEach(REMOVED_OPTIONS_REPLACEMENTS, function(replacement, option) {
        if (_.includes(process.argv, option)) {
            throw new GeminiError(
                util.format('Option %s is removed. Instead use %s', option, replacement)
            );
        }
    });
}

function checkForRemovedEnvVars() {
    _.forEach(REMOVED_ENV_REPLACEMENTS, function(replacement, option) {
        if (option in process.env) {
            console.warn(
                'WARNING: %s env var is not longer used. Use %s instead',
                chalk.red(option),
                chalk.cyan(replacement)
            );
        }
    });
}
