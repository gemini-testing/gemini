'use strict';

const q = require('q');
const qDebugMode = require('q-debug-mode');
const QEmitter = require('qemitter');
const debug = require('debug');

const _ = require('lodash');
const chalk = require('chalk');
const Runner = require('./runner');
const StateProcessor = require('./state-processor');
const Config = require('./config');
const readTests = require('./test-reader');
const SuiteCollection = require('./suite-collection');

const RunnnerStats = require('./stats');
const RunnerEvents = require('./constants/runner-events');

const GeminiError = require('./errors/gemini-error');

const temp = require('./temp');

// Hack for node@0.10 and lower
// Remove restriction for maximum open concurrent sockets
require('http').globalAgent.maxSockets = Infinity;

const parseBrowsers = (browsers) => {
    return browsers && browsers.replace(/\s/g, '').split(',');
};

// Gemini needs to inherit from QEmitter rather then
// EventEmmiter because it needs to allow `startRunner`
// event handler delay the execution of tests
module.exports = class Gemini extends QEmitter {
    constructor(config, allowOverrides) {
        super();

        this.config = new Config(config, allowOverrides);
        this.SuiteCollection = SuiteCollection;

        setupLog(this.config.system.debug);

        require('./plugins').load(this, this.config);
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

        const runner = new Runner(this.config, stateProcessor);
        const envBrowsers = parseBrowsers(process.env.GEMINI_BROWSERS);
        const envSkipBrowsers = parseBrowsers(process.env.GEMINI_SKIP_BROWSERS);
        const browsers = options.browsers || envBrowsers;

        if (browsers) {
            this.checkUnknownBrowsers(browsers);

            runner.setTestBrowsers(this.getValidBrowsers(browsers));
        }

        const getTests = (source, grep) => {
            return source instanceof SuiteCollection
                ? q(source)
                : this.readTests(source, grep);
        };

        const notifyEndRunner = (data) => {
            return this.emitAndWait(RunnerEvents.END_RUNNER, runner, data).thenResolve(data);
        };

        return getTests(paths, options.grep)
            .then((suiteCollection) => {
                return this.emitAndWait(RunnerEvents.START_RUNNER, runner)
                    .thenResolve(suiteCollection);
            })
            .then((suiteCollection) => {
                this.checkUnknownBrowsers(envSkipBrowsers);

                const validSkippedBrowsers = this.getValidBrowsers(envSkipBrowsers);

                suiteCollection.skipBrowsers(validSkippedBrowsers);
                options.reporters.forEach((reporter) => applyReporter(runner, reporter));

                const stats = new RunnnerStats(runner);

                return runner.run(suiteCollection)
                    .thenResolve(stats.get());
            })
            .then(notifyEndRunner, (e) => notifyEndRunner().thenReject(e));
    }

    readTests(paths, grep) {
        return readTests(paths, this.config)
            .then((rootSuite) => {
                if (grep) {
                    applyGrep_(grep, rootSuite);
                }

                return new SuiteCollection(rootSuite.children);
            });

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
        return this._run(StateProcessor.createScreenUpdater(options), paths, options);
    }

    test(paths, options) {
        return this._run(StateProcessor.createTester(this.config), paths, options);
    }

    getScreenshotPath(suite, stateName, browserId) {
        return this.config.forBrowser(browserId).getScreenshotPath(suite, stateName);
    }

    getBrowserCapabilites(browserId) {
        return this.config.forBrowser(browserId).desiredCapabilities;
    };

    getValidBrowsers(browsers) {
        return _.intersection(browsers, this.browserIds);
    };

    checkUnknownBrowsers(browsers) {
        const browsersFromConfig = this.browserIds;
        const unknownBrowsers = _.difference(browsers, browsersFromConfig);

        if (unknownBrowsers.length) {
            console.warn(
                `${chalk.yellow('WARNING:')} Unknown browsers id: ${unknownBrowsers.join(', ')}.\n` +
                `Use one of the browser ids specified in config file: ${browsersFromConfig.join(', ')}`
            );
        }
    };

    get browserIds() {
        return this.config.getBrowserIds();
    }
};

function applyReporter(runner, reporter) {
    if (typeof reporter === 'string') {
        try {
            reporter = require('./reporters/' + reporter);
        } catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                throw new GeminiError('No such reporter: ' + reporter);
            }
            throw e;
        }
    }
    if (typeof reporter !== 'function') {
        throw new TypeError('Reporter must be a string or a function');
    }

    reporter(runner);
}

function setupLog(isDebug) {
    if (isDebug) {
        qDebugMode(q);
        debug.enable('gemini:*');
    }
}
