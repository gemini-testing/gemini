'use strict';

var common = require('./common'),

    Config = require('../config'),
    ScreenShooter = require('../screen-shooter'),
    treeReporter = require('../reporters/tree');

module.exports = function() {
    this.title('Gather screenshots of all states')
        .helpful()
        .apply(common.testFiles)
        .apply(common.configFile)
        .act(function(opts, args) {
            return Config.read(opts.configFile)
                .then(function(config) {
                    return [config, common.buildSuite(args.testFiles)];
                })
                .spread(function(config, suite) {
                    var shooter = new ScreenShooter(config),
                        exitCode = 0;

                    shooter.on('error', function() {
                        exitCode = 2;
                    });

                    treeReporter(shooter);

                    return shooter.run(suite.children)
                        .then(function() {
                            return common.exitCoa(exitCode);
                        });

                })
                .fail(common.handleErrors);
        });
};
