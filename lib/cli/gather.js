'use strict';

var q = require('q'),
    chalk = require('chalk'),

    common = require('./common'),

    Config = require('../config'),
    ScreenShooter = require('../screen-shooter'),
    GeminiError = require('../gemini-error');

module.exports = function() {
    this.title('Gather screenshots of all states')
        .helpful()
        .apply(common.plansFiles)
        .apply(common.configFile)
        .act(function(opts, args) {
            return Config.read(opts.configFile)
                .then(function(config) {
                    return [config, common.readPlans(args.plansFiles)];
                })
                .spread(function(config, plans) {
                    var shooter = new ScreenShooter(config);

                    shooter.on('capture', function(data) {
                        console.log(chalk.blue(data.planName) + ': ' + chalk.green(data.stateName));
                    });
                    return shooter.runPlans(plans);

                })
                .then(function() {
                    return chalk.green('Gathered all screenshots');
                })
                .fail(function(e) {
                    if (e instanceof GeminiError) {
                        console.error(chalk.red('Error: ') + e.message);
                        if (e.advice) {
                            console.error(chalk.green('To fix:'), e.advice);
                        }
                        return q.reject();
                    }
                    return q.reject(e);
                });
        });
};
