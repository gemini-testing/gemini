var path = require('path'),

    chalk = require('chalk'),

    common = require('./common'),

    Config = require('../config'),
    Runner = require('../runner'),
    Shooter = require('../shooter');


module.exports = function() {
    this.title('Gather screenshots of all states')
        .helpful()
        .apply(common.testFile)
        .apply(common.configFile)
        .act(function(opts, args) {
            var shooter = Shooter.read(path.resolve(args.testFile));
            return Config.read(opts.configFile)
                .then(function(config) {
                    var runner = new Runner(config);
                    runner.on('screenshot', function(name, state) {
                        console.log(chalk.blue(name) + ': ' + chalk.green(state));
                    });
                    return runner.runTest(shooter);
                })
                .then(function() {
                    return chalk.green('Everything OK!');
                });
        });
};
