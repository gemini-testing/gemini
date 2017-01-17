'use strict';

const _ = require('lodash');
const program = require('commander');
const Promise = require('bluebird');

const Config = require('../config');
const Events = require('../constants/events');
const Gemini = require('../gemini');
const pkg = require('../../package.json');
const handleErrors = require('./errors').handleErrors;
const checkForDeprecations = require('./deprecations').checkForDeprecations;
const handleUncaughtExceptions = require('./errors').handleUncaughtExceptions;

let exitCode;

exports.run = () => {
    program
        .version(pkg.version)
        .option('-b, --browser <browser>', 'run test only in specified browser', collect)
        .option('-c, --config <file>', 'config file')
        .option('--grep <pattern>', 'run only suites matching the pattern', RegExp);

    program.command('update [paths...]')
        .allowUnknownOption(true)
        .option('--diff', 'update only screenshots with diff')
        .option('--new', 'save only new screenshots')
        .description('update the changed screenshots or gather if they doesn\'t exist')
        .action((paths, options) => runGemini('update', paths, options).done());

    program.command('test [paths...]')
        .allowUnknownOption(true)
        .option('-r, --reporter <reporter>', 'test result reporter (flat by default)', collect)
        .option('--html-reporter-path <path>', 'relative path where html reporters will be stored', collect)
        .option('-s, --set <set>', 'set to run', collect)
        .description('run tests')
        .on('--help', () => {
            console.log('  Reporters:');
            console.log('    flat    console reporter');
            console.log('    vflat   verbose console reporter');
            console.log('    html    HTML reporter. Result stored in \'gemini-report\' directory');
            console.log('');
        })
        .action((paths, options) => runGemini('test', paths, options).done());

    program.on('--help', () => {
        console.log('  Overriding config');
        console.log('    To override any config option use full option path converted to --kebab-case');
        console.log('');

        console.log('    Examples:');
        console.log('      gemini test --system-debug true');
        console.log('      gemini update --root-url http://example.com');
        console.log('      gemini test --browsers-ie-8-window-size 1024x768');
        console.log('');
        console.log('    You can also use environment variables converted to snake_case with');
        console.log('    gemini_ prefix');
        console.log('');
        console.log('    Examples:');
        console.log('      gemini_system_debug=true gemini test');
        console.log('      gemini_root_url=http://example.com gemini update');
        console.log('      gemini_browsers_ie8_window_size=1024x768 gemini test');
        console.log('');
        console.log('    If both cli flag and env var are used, cli flag takes precedence') ;
    });

    program.option('list', 'Use \'list browsers\' or \'list sets\' to get all available browsers or sets.')
        .action((option) => logOptionFromConfig(option));

    program.parse(process.argv);
};

function logOptionFromConfig(option) {
    const config = parseConfig(program.config);

    console.log(config[option] || `Cannot list option ${option}. Available options are: sets, browsers`);
}

function parseConfig(configPath) {
    const config = new Config(configPath);

    return {
        sets: _.keys(config.sets).join(', '),
        browsers: config.getBrowserIds().join(', ')
    };
}

function collect(newValue, array) {
    array = array || [];
    return array.concat(newValue);
}

function runGemini(method, paths, options) {
    options = options || {};

    handleUncaughtExceptions();

    return Promise.try(() => {
        checkForDeprecations();

        const gemini = new Gemini(program.config, {cli: true, env: true});
        gemini.on(Events.INTERRUPT, (data) => exitCode = data.exitCode);

        return gemini;
    })
        .then((gemini) => {
            return gemini[method](paths, {
                sets: options.set,
                reporters: parseReporterOptions(options),
                grep: program.grep,
                browsers: program.browser,
                diff: options.diff,
                new: options.new
            });
        })
        .then((stats) => {
            if (stats.failed > 0 || stats.errored > 0) {
                return 2;
            }
            return 0;
        })
        .catch(handleErrors)
        .then(exit);
}

function parseReporterOptions(options) {
    if (!options.reporter) {
        return [{name: 'flat'}];
    }

    return options.reporter.map(function(name) {
        return {
            name,
            path: options[`${name}ReporterPath`]
        };
    });
}

function exit(code) {
    process.on('exit', () => process.exit(exitCode || code));
}
