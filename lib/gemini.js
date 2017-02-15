'use strict';

const debug = require('debug');
const chalk = require('chalk');
const _ = require('lodash');
const PassthroughEmitter = require('./passthrough-emitter');
const Promise = require('bluebird');
const q = require('bluebird-q');
const pluginsLoader = require('plugins-loader');
const gracefulFs = require('graceful-fs');

const Config = require('./config');
const GeminiError = require('./errors/gemini-error');
const readTests = require('./test-reader');
const Runner = require('./runner');
const Events = require('./constants/events');
const RunnerStats = require('./stats');
const StateProcessor = require('./state-processor');
const SuiteCollection = require('./suite-collection');
const temp = require('./temp');

const PREFIX = require('../package').name + '-';

// Hack for node@0.10 and lower
// Remove restriction for maximum open concurrent sockets
require('http').globalAgent.maxSockets = Infinity;
Promise.promisifyAll(require('fs-extra'));

// patch fs module prototype for preventing EMFILE error (too many open files)
gracefulFs.gracefulify(require('fs'));

const parseBrowsers = (browsers) => {
    return browsers && browsers.replace(/\s/g, '').split(',');
};

module.exports = class Gemini extends PassthroughEmitter {
    static create(config, allowOverrides) {
        return new Gemini(config, allowOverrides);
    }

    constructor(config, allowOverrides) {
        super();

        this.config = new Config(config, allowOverrides);

        this.events = Events;
        this.SuiteCollection = SuiteCollection;

        setupLog(this.config.system.debug);
        this._loadPlugins();
    }

    static readRawConfig(filePath) {
        return Config.readRawConfig(filePath);
    }

    _run(stateProcessor, paths, options) {
        if (!options) {
            //if there are only two arguments, they are
            //(stateProcessor, options) and paths are
            //the default.
            options = paths;
            paths = undefined;
        }
        options = options || {};
        options.reporters = options.reporters || [];

        temp.init(this.config.system.tempDir);

        const runner = Runner.create(this.config, stateProcessor);
        const envBrowsers = parseBrowsers(process.env.GEMINI_BROWSERS);
        const envSkipBrowsers = parseBrowsers(process.env.GEMINI_SKIP_BROWSERS);

        options.browsers = options.browsers || envBrowsers;

        this._passThroughEvents(runner);

        // it is important to require signal handler here in order to guarantee subscribing to "INTERRUPT" event
        require('./signal-handler').on(Events.INTERRUPT, (data) => {
            this.emit(Events.INTERRUPT, data);

            runner.cancel();
        });

        if (options.browsers) {
            this.checkUnknownBrowsers(options.browsers);
        }

        const getTests = (source, options) => {
            return source instanceof SuiteCollection
                ? Promise.resolve(source)
                : this.readTests(source, options);
        };

        return getTests(paths, options)
            .then((suiteCollection) => {
                this.checkUnknownBrowsers(envSkipBrowsers);

                const validSkippedBrowsers = this.getValidBrowsers(envSkipBrowsers);

                suiteCollection.skipBrowsers(validSkippedBrowsers);
                options.reporters.forEach((reporter) => applyReporter(runner, reporter));

                const stats = new RunnerStats(runner);

                return runner.run(suiteCollection)
                    .then(() => stats.get());
            });
    }

    _passThroughEvents(runner) {
        this.passthroughEvent(runner, _.values(Events));
    }

    _loadPlugins() {
        pluginsLoader.load(this, this.config.system.plugins, PREFIX);
    }

    readTests(paths, options) {
        if (_.isRegExp(options)) {
            console.warn(chalk.yellow(
                `Passing grep to readTests is deprecated. You should pass an object with options: {grep: ${options}}.`
            ));

            options = {grep: options};
        } else {
            options = options || {};
        }

        options = _.assignIn(options, {paths});

        return q(readTests(this, this.config, options)
            .then((rootSuite) => {
                if (options.grep) {
                    applyGrep_(options.grep, rootSuite);
                }

                return new SuiteCollection(rootSuite.children);
            }));

        function applyGrep_(grep, suite) {
            if (!suite.hasStates) {
                _.clone(suite.children).forEach((child) => {
                    applyGrep_(grep, child, suite);
                });
            } else {
                if (!grep.test(suite.fullName)) {
                    suite.parent.removeChild(suite);
                }
            }

            if (!suite.hasStates && !suite.children.length && suite.parent) {
                suite.parent.removeChild(suite);
            }
        }
    }

    update(paths, options) {
        return q(this._run(StateProcessor.createScreenUpdater(options), paths, options));
    }

    test(paths, options) {
        return q(this._run(StateProcessor.createTester(this.config), paths, options));
    }

    getScreenshotPath(suite, stateName, browserId) {
        return this.config.forBrowser(browserId).getScreenshotPath(suite, stateName);
    }

    getBrowserCapabilites(browserId) {
        return this.config.forBrowser(browserId).desiredCapabilities;
    }

    getValidBrowsers(browsers) {
        return _.intersection(browsers, this.browserIds);
    }

    checkUnknownBrowsers(browsers) {
        const browsersFromConfig = this.browserIds;
        const unknownBrowsers = _.difference(browsers, browsersFromConfig);

        if (unknownBrowsers.length) {
            console.warn(
                `${chalk.yellow('WARNING:')} Unknown browsers id: ${unknownBrowsers.join(', ')}.\n` +
                `Use one of the browser ids specified in config file: ${browsersFromConfig.join(', ')}`
            );
        }
    }

    get browserIds() {
        return this.config.getBrowserIds();
    }
};

function applyReporter(runner, reporter) {
    if (typeof reporter === 'string') {
        reporter = {name: reporter};
    }
    if (typeof reporter === 'object') {
        const reporterPath = reporter.path;
        try {
            reporter = require('./reporters/' + reporter.name);
        } catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                throw new GeminiError('No such reporter: ' + reporter.name);
            }
            throw e;
        }

        return reporter(runner, reporterPath);
    }
    if (typeof reporter !== 'function') {
        throw new TypeError('Reporter must be a string, an object or a function');
    }

    reporter(runner);
}

function setupLog(isDebug) {
    if (isDebug) {
        Promise.config({
            longStackTraces: true
        });
        debug.enable('gemini:*');
    }
}
