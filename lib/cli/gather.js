'use strict';

var q = require('q'),
    common = require('./common'),

    Gemini = require('../gemini'),
    flatReporter = require('../reporters/flat');

module.exports = function() {
    this.title('Gather screenshots of all states')
        .helpful()
        .apply(common.common)
        .act(function(opts, args) {
            return q
                .fcall(function() {
                    return new Gemini(opts.configFile, opts);
                })
                .then(function(gemini) {
                    return gemini.gather(args.testFiles, {
                        reporters: [flatReporter],
                        grep: opts.grep,
                        browsers: opts.browsers
                    });
                })
                .then(function(stats) {
                    return stats.errored > 0? 2 : 0;
                })
                .then(common.exitCoa)
                .fail(common.handleErrors);
        });
};
