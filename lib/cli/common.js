'use strict';

var q = require('q'),
    chalk = require('chalk'),
    pathUtils = require('../path-utils'),
    exposeTestsApi = require('../tests-api.js'),
    publicApi = require('../public-api'),
    Suite = require('../suite'),
    GeminiError = require('../errors/gemini-error');

exports.common = function() {
    this
        .opt()
            .name('configFile')
            .long('config').short('c')
            .title('Config file')
            .end()
        .opt()
            .name('sourceRoot')
            .long('source-root')
            .title('Set path of the sources. Used with source maps to resolve relative paths from')
            .end()
        .opt()
            .name('rootUrl')
            .long('root-url').short('r')
            .title('Override root url')
            .end()
        .opt()
            .name('gridUrl')
            .long('grid-url').short('g')
            .title('Override grid url')
            .end()
        .opt()
            .name('screenshotsDir')
            .long('screenshots-dir').short('s')
            .title('Override screenshots dir')
            .end()
        .opt()
            .name('debug')
            .long('debug')
            .flag()
            .title('Turn on debugging output to the console')
            .end()
        .opt()
            .name('coverage')
            .long('coverage')
            .flag()
            .title('Turn on CSS coverage report')
            .end()
        .opt()
            .name('coverageNoHtml')
            .long('coverage-no-html')
            .flag()
            .title('Disable coverage html report (Enabled by default when coverage=true. ' +
                    'When disabled only json report will be generated)')
            .end()
        .opt()
            .name('grep')
            .long('grep')
            .title('Execute suits matching the pattern only')
            .val(function(value) {
                return new RegExp(value, 'i');
            })
            .end()
        .opt()
            .name('browsers')
            .long('browser')
            .short('b')
            .long('Execute tests only in specified browsers')
            .arr()
            .end()
        .arg()
            .name('testFiles')
            .title('Paths to files or directories, containing tests')
            .arr()
            .end();
};

exports.buildSuite = function(testFiles) {
    return pathUtils.expandPaths(testFiles)
        .then(function(expanded) {
            var rootSuite = Suite.create('');
            exposeTestsApi(publicApi, rootSuite);

            expanded.forEach(require);
            return rootSuite;
        });
};

exports.handleErrors = function(error) {
    if (error instanceof GeminiError) {
        return handleGeminiError(error);
    } else if (error.status === 13) {
        //unknow wd error
        return handleUnknownWdError(error);
    }
    return q.reject(error);
};

function handleGeminiError(error) {
    console.error(chalk.red('Error: ') + error.message);
    if (error.advice) {
        console.error(chalk.green('To fix:'), error.advice);
    }
    return exports.exitCoa(1);
}

function handleUnknownWdError(error) {
    console.log(chalk.red('JSONWire Error:'), error.cause.value.message);
    return exports.exitCoa(1);
}

exports.exitCoa = function exitCoa(code) {
    return q.resolve({
        exitCode: code,
        toString: function() {
            return '';
        }
    });
};
