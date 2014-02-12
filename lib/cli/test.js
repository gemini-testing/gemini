'use strict';

var common = require('./common'),

    Config = require('../config'),
    Tester = require('../tester');

module.exports = function() {
    this.title('Compare current state with previous')
        .helpful()
        .apply(common.plansFiles)
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
            var reporter = opts.reporter;
            return Config.read(opts.configFile)
                .then(function(config) {
                    return [config, common.readPlans(args.plansFiles)];
                })
                .spread(function(config, plans) {
                    var tester = new Tester(config);
                    reporter(tester);
                    return tester.runTests(plans);
                 
                });
        });
};
