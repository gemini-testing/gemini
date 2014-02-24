'use strict';

var chalk = require('chalk'),

    common = require('./common'),

    Config = require('../config'),
    ScreenShooter = require('../screen-shooter');

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

                    shooter.on('endCapture', function(data) {
                        console.log(chalk.blue(data.plan) + ': ' + chalk.green(data.state));
                    });
                    return shooter.runPlans(plans);

                })
                .then(function() {
                    return chalk.green('Gathered all screenshots');
                });
        });
};
