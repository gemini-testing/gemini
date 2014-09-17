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
            return Gemini
                .create(opts.configFile, opts)
                .then(function(geminiInstance) {
                    return geminiInstance.test(args.testFiles, {
                        reporters: opts.reporters
                    });
                })
                .then(function(status) {
                    return status === 'success'? 0 : 2;
                })
                .then(common.exitCoa)
                .fail(common.handleErrors);
        });
};
