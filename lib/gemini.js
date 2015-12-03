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
    suiteUtils = require('./suite-util'),

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

        function notifyEndRunner(data) {
            return _this.emitAndWait(RunnerEvents.END_RUNNER, runnerInstance, data).thenResolve(data);
        }

        return _this.readTests(paths)
            .then(function(rootSuite) {
                return _this.emitAndWait(RunnerEvents.START_RUNNER, runnerInstance)
                    .thenResolve(rootSuite);
            })
            .then(function(rootSuite) {
                var suites = suiteUtils.flattenSuites(rootSuite);

                if (options.grep) {
                    suites = suites.filter(function(suite) {
                        return options.grep.test(suite.fullName);
                    });
                }

                options.reporters.forEach(_.partial(applyReporter, runnerInstance));

                var stats = new RunnnerStats(runnerInstance);

                return runnerInstance.run(suites)
                    .thenResolve(stats.get());
            })
            .then(notifyEndRunner, function(e) {
                return notifyEndRunner().thenReject(e);
            });
    }

    this.readTests = function(paths) {
        return readTests(paths, this.config);
    };

    this.gather = function(paths, options) {
        return executeRunner(
            new SuiteRunner.createScreenShooter(this.config),
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
