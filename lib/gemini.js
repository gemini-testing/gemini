'use strict';
var Q = require('q'),
    qDebugMode = require('q-debug-mode'),
    QEmitter = require('qemitter'),
    debug = require('debug'),
    util = require('util'),

    _ = require('lodash'),
    chalk = require('chalk'),
    SuiteRunner = require('./runner'),
    Config = require('./config'),
    readTests = require('./test-reader'),
    SuiteCollection = require('./suite-collection'),

    RunnnerStats = require('./stats'),
    RunnerEvents = require('./constants/runner-events'),

    GeminiError = require('./errors/gemini-error'),

    DEFAULT_CFG_NAME = '.gemini.yml';

// Hack for node@0.10 and lower
// Remove restriction for maximum open concurrent sockets
require('http').globalAgent.maxSockets = Infinity;

function Gemini(config, allowOverrides) {
    QEmitter.call(this);
    config = config || DEFAULT_CFG_NAME;
    this.config = new Config(config, allowOverrides);
    if (this.config.system.debug) {
        debug.enable('gemini:*');
        qDebugMode(Q);
    }

    var _this = this;

    require('./plugins').load(_this, this.config);

    function executeRunner(runnerInstance, paths, options) {
        if (!options) {
            //if there are only two arguments, they are
            //(runnerInstance, options) and paths are
            //the default.
            options = paths;
            paths = undefined;
        }
        options = options || {};
        options.reporters = options.reporters || [];

        var envBrowsers = process.env.GEMINI_BROWSERS? process.env.GEMINI_BROWSERS.replace(/\s/g, '').split(',') : null;
        options.browsers = options.browsers || envBrowsers;

        if (options.browsers) {
            var browsersFromConfig = _this.browserIds,
                validBrowsers = _.intersection(options.browsers, browsersFromConfig),
                unknownBrowsers = _.difference(options.browsers, browsersFromConfig);

            if (unknownBrowsers.length) {
                console.warn(util.format(
                    '%s Unknown browsers id: %s. Use one of the browser ids specified in config file: %s',
                    chalk.yellow('WARNING:'), unknownBrowsers.join(', '), browsersFromConfig.join(', ')
                ));
            }

            runnerInstance.setTestBrowsers(validBrowsers);
        }

        return getTests_(paths, options.grep)
            .then(function(suiteCollection) {
                return _this.emitAndWait(RunnerEvents.START_RUNNER, runnerInstance)
                    .thenResolve(suiteCollection);
            })
            .then(function(suiteCollection) {
                var suites = suiteCollection.allSuites();

                options.reporters.forEach(_.partial(applyReporter, runnerInstance));

                var stats = new RunnnerStats(runnerInstance);

                return runnerInstance.run(suites)
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
            return _this.emitAndWait(RunnerEvents.END_RUNNER, runnerInstance, data).thenResolve(data);
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

    this.gather = util.deprecate(function(paths, options) {
            return executeRunner(
                new SuiteRunner.createScreenShooter(this.config),
                paths,
                options);
        }, 'gemini.gather' + chalk.red(' is deprecated.\n') +
        'Use ' + chalk.green('gemini.update') + ' instead.'
    );

    this.update = function(paths, options) {
        return executeRunner(
            new SuiteRunner.createScreenUpdater(this.config, options),
            paths,
            options);
    };

    this.test = function(paths, options) {
        return executeRunner(
            new SuiteRunner.createTester(this.config, {tempDir: options.tempDir}),
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

module.exports = Gemini;
