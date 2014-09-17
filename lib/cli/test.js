'use strict';

var common = require('./common'),

    Gemini = require('../gemini');

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
            .def('flat')
            .end()
        .act(function(opts, args) {
            return new Gemini(opts.configFile, opts)
                .test(args.testFiles, {
                    reporters: opts.reporters
                })
                .then(function(stats) {
                    if (stats.failed > 0 && stats.errored > 0) {
                        return 2;
                    }
                    return 1;
                })
                .then(common.exitCoa)
                .fail(common.handleErrors);
        });
};
