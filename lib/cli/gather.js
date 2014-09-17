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
            return Gemini
                .create(opts.configFile, opts)
                .then(function(geminiInstance) {
                    return geminiInstance.gather(args.testFiles, {
                        reporters: [flatReporter]
                    });
                })
                .then(function(status) {
                    return status === 'success'? 0 : 2;
                })
                .then(common.exitCoa)
                .fail(common.handleErrors);
        });
};
