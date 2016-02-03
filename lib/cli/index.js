'use strict';

var pkg = require('../../package.json'),
    program = require('commander'),
    q = require('q'),
    handleErrors = require('./errors').handleErrors,
    Gemini = require('../gemini'),
    checkForDeprecations = require('./deprecations').checkForDeprecations;

exports.run = function() {
    program
        .version(pkg.version)
        .option('-b, --browser <browser>', 'run test only in specified browser', collect)
        .option('-c, --config <file>', 'config file')
        .option('--grep <pattern>', 'run only suites matching the pattern', RegExp);

    program.command('gather [paths...]')
        .allowUnknownOption(true)
        .description('gather reference screenshots')
        .action(function(paths) {
            runGemini('gather', paths).done();
        });

    program.command('update [paths...]')
        .allowUnknownOption(true)
        .option('--diff', 'update only screenshots with diff')
        .option('--new', 'save only new screenshots')
        .description('update the changed screenshots or gather if they doesn\'t exist')
        .action(function(paths, options) {
            runGemini('update', paths, options).done();
        });

    program.command('test [paths...]')
        .allowUnknownOption(true)
        .option('-r, --reporter <reporter>', 'test reporter', collect)
        .description('run tests')
        .action(function(paths, options) {
            runGemini('test', paths, options)
                .done();
        });

    program.on('--help', function() {
        console.log('  Overriding config');
        console.log('    To override any config option use full option path converted to --kebab-case');
        console.log('');

        console.log('    Examples:');
        console.log('      gemini test --system-debug true');
        console.log('      gemini gather --root-url http://example.com');
        console.log('      gemini test --browsers-ie8-window-size 1024x768');
        console.log('');
        console.log('    You can also use environment variables converted to snake_case with');
        console.log('    gemini_ prefix');
        console.log('');
        console.log('    Examples:');
        console.log('      gemini_system_debug=true gemini test');
        console.log('      gemini_root_url=http://example.com gemini gather');
        console.log('      gemini_browsers_ie8_window_size=1024x768 gemini test');
        console.log('');
        console.log('    If both cli flag and env var are used, cli flag takes precedence') ;
    });

    program.parse(process.argv);
};

function collect(newValue, array) {
    array = array || [];
    return array.concat(newValue);
}

function runGemini(method, paths, options) {
    options = options || {};
    return q.fcall(function() {
            checkForDeprecations();
            return new Gemini(program.config, {cli: true, env: true});
        })
        .then(function(gemini) {
            return gemini[method](paths, {
                reporters: options.reporter || ['flat'],
                grep: program.grep,
                browsers: program.browser,
                diff: options.diff,
                new: options.new
            });
        })
        .then(function(stats) {
            if (stats.failed > 0 || stats.errored > 0) {
                return 2;
            }
            return 0;
        })
        .fail(handleErrors)
        .then(exit);
}

function exit(code) {
    process.on('exit', function() {
        process.exit(code);
    });
}
