'use strict';

var path = require('path'),

    chalk = require('chalk'),

    common = require('./common'),

    Config = require('../config'),
    ScreenShooter = require('../screen-shooter'),
    Plan = require('../plan');


module.exports = function() {
    this.title('Gather screenshots of all states')
        .helpful()
        .apply(common.testFile)
        .apply(common.configFile)
        .act(function(opts, args) {
            var plan = Plan.read(path.resolve(args.testFile));
            return Config.read(opts.configFile)
                .then(function(config) {
                    var shooter = new ScreenShooter(config);
                    shooter.on('screenshot', function(data) {
                        console.log(chalk.blue(data.name) + ': ' + chalk.green(data.state));
                    });
                    return shooter.runPlan(plan);
                })
                .then(function() {
                    return chalk.green('Everything OK!');
                });
        });
};
