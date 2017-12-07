'use strict';

const _ = require('lodash');
const {Command} = require('commander');

const Events = require('../constants/events');
const Gemini = require('../gemini');
const pkg = require('../../package.json');
const {checkForDeprecations} = require('./deprecations');
const {handleErrors, handleUncaughtExceptions} = require('./errors');

let exitCode;

exports.run = () => {
    const program = new Command();

    program
        .version(pkg.version)
        .allowUnknownOption()
        .option('-c, --config <file>', 'config file');

    const configPath = preparseOption(program, 'config');
    const gemini = mkGemini(configPath);

    program
        .option('-b, --browser <browser>', 'run test only in specified browser', collect)
        .option('--grep <pattern>', 'run only suites matching the pattern', RegExp);

    program.command('update [paths...]')
        .allowUnknownOption()
        .option('--diff', 'update only screenshots with diff')
        .option('--new', 'save only new screenshots')
        .description('update the changed screenshots or gather if they doesn\'t exist')
        .action((paths, options) => mkRunFn(gemini, 'update', program)(paths, options).done());

    program.command('test [paths...]')
        .allowUnknownOption()
        .option('-r, --reporter <reporter>', 'test result reporter (flat by default)', collect)
        .option('-s, --set <set>', 'set to run', collect)
        .description('run tests')
        .on('--help', () => {
            console.log('  Reporters:');
            console.log('    flat    console reporter');
            console.log('    vflat   verbose console reporter');
            console.log('');
        })
        .action((paths, options) => mkRunFn(gemini, 'test', program)(paths, options).done());

    program.command('list <key>')
        .description(`Use 'list browsers' or 'list sets' to get all available browsers or sets.`)
        .action((key) => logOptionFromConfig(key, gemini));

    program.on('--help', () => {
        console.log('');
        console.log('  Overriding config:');
        console.log('');
        console.log('    To override any config option use full option path converted to --kebab-case.');
        console.log('');

        console.log('    Examples:');
        console.log('      gemini test --system-debug true');
        console.log('      gemini update --root-url http://example.com');
        console.log('      gemini test --browsers-ie-8-window-size 1024x768');
        console.log('');
        console.log('    You can also use environment variables converted to snake_case with');
        console.log('    gemini_ prefix.');
        console.log('');
        console.log('    Examples:');
        console.log('      gemini_system_debug=true gemini test');
        console.log('      gemini_root_url=http://example.com gemini update');
        console.log('      gemini_browsers_ie8_window_size=1024x768 gemini test');
        console.log('');
        console.log('    If both cli flag and env var are used, cli flag takes precedence.') ;
        console.log('    For more information see https://gemini-testing.github.io/doc/config.html') ;
        console.log('');
    });

    gemini.extendCli(program);

    program.parse(process.argv);
};

function preparseOption(program, option) {
    // do not display any help, do not exit
    const configFileParser = Object.create(program);
    configFileParser.options = [].concat(program.options);
    configFileParser.option('-h, --help');

    configFileParser.parse(process.argv);
    return configFileParser[option];
}

function mkGemini(configPath) {
    checkForDeprecations();

    const gemini = new Gemini(configPath, {cli: true, env: true});
    gemini.on(Events.INTERRUPT, (data) => exitCode = data.exitCode);

    return gemini;
}

function mkRunFn(gemini, method, globalOpts) {
    return (paths, opts = {}) => {
        handleUncaughtExceptions();

        return gemini[method](paths, {
            sets: opts.set,
            reporters: parseReporterOptions(opts),
            grep: globalOpts.grep,
            browsers: globalOpts.browser,
            diff: opts.diff,
            new: opts.new
        })
        .then((stats) => stats.failed > 0 ? 2 : 0)
        .catch(handleErrors)
        .then(exit);
    };
}

function logOptionFromConfig(key, {config}) {
    const data = {
        sets: _.keys(config.sets).join(', '),
        browsers: config.getBrowserIds().join(', ')
    };

    console.log(data[key] || `Cannot list option ${key}. Available options are: sets, browsers`);
}

function collect(newValue, array = []) {
    return array.concat(newValue);
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
