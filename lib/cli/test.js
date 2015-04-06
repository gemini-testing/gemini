'use strict';

var q = require('q'),
    common = require('./common'),

    Gemini = require('../gemini');

module.exports = function() {
    this.title('Compare current state with previous')
        .helpful()
        .apply(common.common)
        .opt()
            .name('reporters')
            .long('reporter')
            .arr()
            .def('flat')
            .end()
        .act(function(opts, args) {
            return q
                .fcall(function() {
                    return new Gemini(opts.configFile, opts);
                })
                .then(function(gemini) {
                    return gemini.test(args.testFiles, {
                        reporters: opts.reporters,
                        grep: opts.grep,
                        browsers: opts.browsers
                    });
                })
                .then(function(stats) {
                    if (stats.failed > 0 || stats.errored > 0) {
                        return 2;
                    }
                    return 0;
                })
                .then(common.exitCoa)
                .fail(common.handleErrors);
        });
};
