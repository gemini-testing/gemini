'use strict';

var q = require('q'),
    chalk = require('chalk'),
    pathUtils = require('../path-utils'),
    exposeTestsApi = require('../tests-api.js'),
    publicApi = require('../public-api'),
    Suite = require('../suite'),
    GeminiError = require('../errors/gemini-error');


var DEFAULT_CFG_NAME = '.gemini.yml',
    DEFAULT_PLANS_DIR = 'gemini';

exports.testFiles = function() {
    this.arg()
        .name('testFiles')
        .title('Paths to files or directories, containing tests')
        .arr()
        .def([DEFAULT_PLANS_DIR])
        .end();
};

exports.configFile = function() {
    this.opt()
        .name('configFile')
        .long('config').short('c')
        .title('Config file')
        .def(DEFAULT_CFG_NAME)
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
        console.error(chalk.red('Error: ') + error.message);
        if (error.advice) {
            console.error(chalk.green('To fix:'), error.advice);
        }
        return q.reject();
    }
    return q.reject(error);
};
