'use strict';

var common = require('./common'),

    Gemini = require('../gemini'),
    flatReporter = require('../reporters/flat');

module.exports = function() {
    this.title('Gather screenshots of all states')
        .helpful()
        .apply(common.testFiles)
        .apply(common.configFile)
        .apply(common.configOverrides)
        .act(function(opts, args) {
            return new Gemini(opts.configFile, opts)
                .gather(args.testFiles, {
                    reporters: [flatReporter]
                })
                .then(function(stats) {
                    return stats.errored > 0? 2 : 0;
                })
                .then(common.exitCoa)
                .fail(common.handleErrors);
        });
};
