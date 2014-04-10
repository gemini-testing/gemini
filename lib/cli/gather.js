'use strict';

var util = require('util'),
    chalk = require('chalk'),

    common = require('./common'),

    Config = require('../config'),
    ScreenShooter = require('../screen-shooter');

function formatError(error) {

    return util.format('%s: %s:%s - %s in %s:\n%s',
        chalk.red('error'),
        chalk.underline(error.planName),
        chalk.underline(error.suiteName),
        chalk.cyan(error.stateName),
        chalk.underline(error.suiteName),
        chalk.white(error.browserName),
        stateErrorMessage(error)
    );
}

function stateErrorMessage(error) {
    if (error.originalError) {
        error = error.originalError;
    }

    return error.stack || error.message;
}

function formatCapture(data) {
    return util.format('%s: %s:%s - %s in %s',
        chalk.green('captured'),
        chalk.underline(data.planName),
        chalk.underline(data.suiteName),
        chalk.cyan(data.stateName),
        chalk.white(data.browserName)
    );
}

module.exports = function() {
    this.title('Gather screenshots of all states')
        .helpful()
        .apply(common.plansFiles)
        .apply(common.configFile)
        .act(function(opts, args) {
            var errors = false;
            return Config.read(opts.configFile)
                .then(function(config) {
                    return [config, common.readPlans(args.plansFiles)];
                })
                .spread(function(config, plans) {
                    var shooter = new ScreenShooter(config);

                    shooter.on('capture', function(data) {
                        console.log(formatCapture(data));
                    });

                    shooter.on('error', function(e) {
                        errors = true;
                        console.log(formatError(e));
                    });

                    return shooter.runPlans(plans);

                })
                .then(function() {
                    if (errors) {
                        return chalk.red('Some screenshots was not gathered');
                    } else {
                        return chalk.green('Gathered all screenshots');
                    }
                })
                .fail(common.handleErrors);
        });
};
