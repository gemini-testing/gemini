var path = require('path'),

    chalk = require('chalk'),

    common = require('./common'),

    Config = require('../config'),
    Tester = require('../tester'),
    Plan = require('../plan');


module.exports = function() {
    this.title('Compare current state with previous')
        .helpful()
        .apply(common.testFile)
        .apply(common.configFile)
        .act(function(opts, args) {
            var plan = Plan.read(path.resolve(args.testFile));
            return Config.read(opts.configFile)
                .then(function(config) {
                    var tester = new Tester(config);
                    tester.on('test', function (test) {
                        var color = test.equal ? chalk.green : chalk.red;
                        console.log(chalk.blue(test.name) + ': ' + color(test.state));
                    });

                    return tester.runTest(plan);
                });
        });
};
