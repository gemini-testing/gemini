'use strict';
var QEmitter = require('qemitter'),
    util = require('util'),
    path = require('path'),

    _ = require('lodash'),
    chalk = require('chalk'),
    ScreenShooter = require('./screen-shooter'),
    Tester = require('./tester'),
    Config = require('./config'),
    Suite = require('./suite'),
    suiteUtils = require('./suite-util'),

    pathUtils = require('./path-utils'),
    publicApi = require('./public-api'),
    RunnnerStats = require('./stats'),
    RunnerEvents = require('./constants/runner-events'),

    exposeTestsApi = require('./tests-api'),

    GeminiError = require('./errors/gemini-error'),
    Image = require('./image'),

    DEFAULT_CFG_NAME = '.gemini.yml',
    DEFAULT_SPECS_DIR = 'gemini';

function requireWithNoCache(moduleName) {
    var result = require(moduleName);
    delete require.cache[moduleName];
    return result;
}

function Gemini(config, overrides) {
    QEmitter.call(this);
    config = config || DEFAULT_CFG_NAME;
    this.config = new Config(config, overrides);
    var _this = this;

    require('./plugins').load(_this, this.config);

    function getDefaultSpecsDir() {
        return path.join(_this.config.system.projectRoot, DEFAULT_SPECS_DIR);
    }

    function executeRunner(runnerInstance, paths, options) {
        if (!options) {
            //if there are only two arguments, they are
            //(runnerInstance, options) and paths are
            //the default.
            options = paths;
            paths = [getDefaultSpecsDir()];
        }
        options = options || {};
        options.reporters = options.reporters || [];

        var envBrowsers = process.env.GEMINI_BROWSERS? process.env.GEMINI_BROWSERS.split(',') : null;
        options.browsers = options.browsers || envBrowsers;

        if (options.browsers) {
            areAllBrowsersFromConfig(options.browsers, _this.browserIds);
            runnerInstance.setTestBrowsers(options.browsers);
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
            .then(function(data) {
                return _this.emitAndWait(RunnerEvents.END_RUNNER, runnerInstance, data)
                    .thenResolve(data);
            });
    }

    function areAllBrowsersFromConfig(browsers, browsersFromConfig) {
        browsers.forEach(function(name) {
            if (browsersFromConfig.indexOf(name) === -1) {
                throw new GeminiError('Unknown browser id: ' + name,
                    'Use one of the browser ids specified in config file: ' +
                    browsersFromConfig.join(', '));
            }
        });
    }

    this.readTests = function(paths) {
        paths = paths || [getDefaultSpecsDir()];
        return pathUtils.expandPaths(paths)
            .then(function(expanded) {
                var rootSuite = Suite.create('');
                exposeTestsApi(publicApi, rootSuite);

                expanded.forEach(requireWithNoCache);
                return rootSuite;
            });
    };

    this.gather = function(paths, options) {
        return executeRunner(
            new ScreenShooter(this.config),
            paths,
            options);
    };

    this.test = function(paths, options) {
        return executeRunner(
            new Tester(this.config, {tempDir: options.tempDir}),
            paths,
            options
        );
    };

    this.getScreenshotPath = function(suite, stateName, browserId) {
        return this.config.getScreenshotPath(suite, stateName, browserId);
    };

    this.buildDiff = util.deprecate(function(referencePath, currentPath, diffPath) {
            return Image.buildDiff({
                reference: referencePath,
                current: currentPath,
                diff: diffPath,
                diffColor: this.config.diffColor,
                strictComparison: this.config.strictComparison,
                tolerance: this.config.tolerance
            });
        }, 'gemini.buildDiff' + chalk.red(' is deprecated.\n') +
        'Use ' + chalk.green('testResult.saveDiffTo(path)') +
        ' in ' + chalk.green('endTest') + ' event handler for more accurate diff'
    );

    this.getBrowserCapabilites = function(browserId) {
        return this.config.browsers[browserId];
    };

    Object.defineProperty(this, 'browserIds', {
        enumerable: true,
        get: function() {
            return Object.keys(this.config.browsers);
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
                throw new Error('No such reporter: ' + reporter);
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
