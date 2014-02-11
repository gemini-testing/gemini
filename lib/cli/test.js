'use strict';

var path = require('path'),

    common = require('./common'),

    Config = require('../config'),
    Tester = require('../tester'),
    Plan = require('../plan');


module.exports = function() {
    this.title('Compare current state with previous')
        .helpful()
        .apply(common.testFile)
        .apply(common.configFile)
        .opt()
            .name('reporter')
            .long('reporter').short('r')
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
            var plan = Plan.read(path.resolve(args.testFile)),
                reporter = opts.reporter;
            return Config.read(opts.configFile)
                .then(function(config) {
                    var tester = new Tester(config);
                    reporter(tester);
                    return tester.runTest(plan);
                 
                });
        });
};
