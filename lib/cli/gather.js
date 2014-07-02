'use strict';

var common = require('./common'),

    Config = require('../config'),
    ScreenShooter = require('../screen-shooter'),
    flatReporter = require('../reporters/flat');

module.exports = function() {
    this.title('Gather screenshots of all states')
        .helpful()
        .apply(common.testFiles)
        .apply(common.configFile)
        .apply(common.configOverrides)
        .act(function(opts, args) {
            return Config.read(opts.configFile, opts)
                .then(function(config) {
                    return [config, common.buildSuite(args.testFiles)];
                })
                .spread(function(config, suite) {
                    var shooter = new ScreenShooter(config),
                        exitCode = 0;

                    shooter.on('error', function() {
                        exitCode = 2;
                    });

                    flatReporter(shooter);

                    return shooter.run(suite)
                        .then(function() {
                            return common.exitCoa(exitCode);
                        });
                })
                .fail(common.handleErrors);
        });
};
