'use strict';
var path = require('path'),
    ScreenShooter = require('./screen-shooter'),
    Tester = require('./tester'),
    Config = require('./config'),
    Suite = require('./suite'),

    pathUtils = require('./path-utils'),
    publicApi = require('./public-api'),

    exposeTestsApi = require('./tests-api'),

    GeminiError = require('./errors/gemini-error'),
    Image = require('./image');

var DEFAULT_CFG_NAME = '.gemini.yml',
    DEFAULT_SPECS_DIR = 'gemini';

function requireWithNoCache(moduleName) {
    var result = require(moduleName);
    delete require.cache[moduleName];
    return result;
}

function Gemini(config, overrides) {
    config = config || DEFAULT_CFG_NAME;
    this.config = new Config(config, overrides);
    var _this = this;

    function getDefaultSpecsDir() {
        return path.join(_this.config.projectRoot, DEFAULT_SPECS_DIR);
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

        if (options.grep) {
            runnerInstance.setGrepPattern(options.grep);
        }
        if (options.browsers) {
            validateBrowsers(options.browsers);
            runnerInstance.setTestBrowsers(options.browsers);
        }
        return _this.readTests(paths)
            .then(function(rootSuite) {
                options.reporters.forEach(applyReporter.bind(null, runnerInstance));
                return runnerInstance.run(rootSuite);
            });
    }

    function validateBrowsers(browsers) {
        var browserIds = _this.browserIds;
        browsers.forEach(function(id) {
            if (browserIds.indexOf(id) === -1) {
                throw new GeminiError('Unknown browser id: ' + id,
                    'Use one of the browser ids specified in config file: ' +
                    browserIds.join(', '));
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
        return executeRunner(new ScreenShooter(this.config), paths, options);
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

    this.buildDiff = function(referencePath, currentPath, diffPath) {
        return Image.buildDiff({
            reference: referencePath,
            current: currentPath,
            diff: diffPath,
            diffColor: this.config.diffColor,
            strictComparison: this.config.strictComparison
        });
    };

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
