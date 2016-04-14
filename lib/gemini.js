'use strict';
var Q = require('q'),
    qDebugMode = require('q-debug-mode'),
    QEmitter = require('qemitter'),
    debug = require('debug'),
    util = require('util'),

    _ = require('lodash'),
    chalk = require('chalk'),
    Runner = require('./runner'),
    StateProcessor = require('./state-processor'),
    Config = require('./config'),
    readTests = require('./test-reader'),
    SuiteCollection = require('./suite-collection'),

    RunnnerStats = require('./stats'),
    RunnerEvents = require('./constants/runner-events'),

    GeminiError = require('./errors/gemini-error'),

    temp = require('./temp');

// Hack for node@0.10 and lower
// Remove restriction for maximum open concurrent sockets
require('http').globalAgent.maxSockets = Infinity;

function Gemini(config, allowOverrides) {
    QEmitter.call(this);
    this.config = new Config(config, allowOverrides);

    setupLog(this.config.system.debug);

    var _this = this;

    require('./plugins').load(_this, this.config);

    function run(stateProcessor, paths, options) {
        if (!options) {
            //if there are only two arguments, they are
            //(stateProcessor, options) and paths are
            //the default.
            options = paths;
            paths = undefined;
        }
        options = options || {};
        options.reporters = options.reporters || [];

        temp.init(_this.config.system.tempDir);

        var runner = new Runner(_this.config, stateProcessor),
            envBrowsers = process.env.GEMINI_BROWSERS
                && process.env.GEMINI_BROWSERS.replace(/\s/g, '').split(','),
            browsers = options.browsers || envBrowsers;

        if (browsers) {
            var browsersFromConfig = _this.browserIds,
                validBrowsers = _.intersection(browsers, browsersFromConfig),
                unknownBrowsers = _.difference(browsers, browsersFromConfig);

            if (unknownBrowsers.length) {
                console.warn(util.format(
                    '%s Unknown browsers id: %s. Use one of the browser ids specified in config file: %s',
                    chalk.yellow('WARNING:'), unknownBrowsers.join(', '), browsersFromConfig.join(', ')
                ));
            }

            runner.setTestBrowsers(validBrowsers);
        }

        return getTests_(paths, options.grep)
            .then(function(suiteCollection) {
                return _this.emitAndWait(RunnerEvents.START_RUNNER, runner)
                    .thenResolve(suiteCollection);
            })
            .then(function(suiteCollection) {
                var suites = suiteCollection.allSuites();

                options.reporters.forEach(_.partial(applyReporter, runner));

                var stats = new RunnnerStats(runner);

                return runner.run(suites)
                    .thenResolve(stats.get());
            })
            .then(notifyEndRunner, function(e) {
                return notifyEndRunner().thenReject(e);
            });

        function getTests_(source, grep) {
            return source instanceof SuiteCollection
                ? Q.resolve(source)
                : _this.readTests(source, grep);
        }

        function notifyEndRunner(data) {
            return _this.emitAndWait(RunnerEvents.END_RUNNER, runner, data).thenResolve(data);
        }
    }

    this.readTests = function(paths, grep) {
        function applyGrep_(grep, suite) {
            if (!suite.hasStates) {
                _.clone(suite.children).forEach(function(child) {
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

        return readTests(paths, this.config)
            .then(function(rootSuite) {
                if (grep) {
                    applyGrep_(grep, rootSuite);
                }

                return new SuiteCollection(rootSuite.children);
            });
    };

    this.gather = util.deprecate(
        function(paths, options) {
            return run(
                StateProcessor.createScreenShooter(),
                paths,
                options
            );
        },
        'gemini.gather' + chalk.red(' is deprecated.\n') +
        'Use ' + chalk.green('gemini.update') + ' instead.'
    );

    this.update = function(paths, options) {
        return run(
            StateProcessor.createScreenUpdater(options),
            paths,
            options
        );
    };

    this.test = function(paths, options) {
        return run(
            StateProcessor.createTester(this.config),
            paths,
            options
        );
    };

    this.getScreenshotPath = function(suite, stateName, browserId) {
        return this.config.forBrowser(browserId).getScreenshotPath(suite, stateName);
    };

    this.getBrowserCapabilites = function(browserId) {
        return this.config.forBrowser(browserId).desiredCapabilities;
    };

    this.SuiteCollection = SuiteCollection;

    Object.defineProperty(this, 'browserIds', {
        enumerable: true,
        get: function() {
            return this.config.getBrowserIds();
        }
    });
}

// Gemini needs to inherit from QEmitter rather then
// EventEmmiter because it needs to allow `startRunner`
// event handler delay the execution of tests
util.inherits(Gemini, QEmitter);

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
        qDebugMode(Q);
        debug.enable('gemini:*');
    }
}

module.exports = Gemini;
