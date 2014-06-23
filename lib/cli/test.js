'use strict';

var common = require('./common'),

    Config = require('../config'),
    Tester = require('../tester');

module.exports = function() {
    this.title('Compare current state with previous')
        .helpful()
        .apply(common.testFiles)
        .apply(common.configFile)
        .apply(common.configOverrides)
        .opt()
            .name('reporters')
            .long('reporter').short('r')
            .arr()
            .def('tree')
            .val(function(value) {
                    try {
                        return require('../reporters/' + value);
                    } catch(e) {
                        if (e.code === 'MODULE_NOT_FOUND') {
                            throw 'No such reporter: ' + value;
                        }
                        throw e;
                    }
            })
            .end()
        .act(function(opts, args) {
            var reporters = opts.reporters;
            return Config.read(opts.configFile, opts)
                .then(function(config) {
                    return [config, common.buildSuite(args.testFiles)];
                })
                .spread(function(config, suite) {
                    var tester = new Tester(config),
                        exitCode = 0;

                    tester.on('error', function() {
                        exitCode = 2;
                    });

                    tester.on('endTest', function(result) {
                        if (!result.equal) {
                            exitCode = 2;
                        }
                    });

                    reporters.forEach(function(reporter) {
                        reporter(tester);
                    });
                    return tester.run(suite)
                        .then(function() {
                            return common.exitCoa(exitCode);
                        });
                 
                })
                .fail(common.handleErrors);
        });
};
