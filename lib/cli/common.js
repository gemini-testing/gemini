'use strict';

var q = require('q'),
    chalk = require('chalk'),
    Plan = require('../plan'),
    pathUtils = require('../path-utils'),
    GeminiError = require('../errors/gemini-error');


var DEFAULT_CFG_NAME = '.gemini.yml',
    DEFAULT_PLANS_DIR = 'gemini';

exports.plansFiles = function() {
    this.arg()
        .name('plansFiles')
        .title('Paths to files or directories, containing plans')
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

exports.readPlans = function(plansFiles) {
    return pathUtils.expandPaths(plansFiles)
        .then(function(expanded) {
            return expanded.map(Plan.read);
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
