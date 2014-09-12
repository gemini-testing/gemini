'use strict';
var q = require('q'),
    ScreenShooter = require('./screen-shooter'),
    Tester = require('./tester'),
    Config = require('./config'),
    Suite = require('./suite'),

    pathUtils = require('./path-utils'),
    publicApi = require('./public-api'),

    exposeTestsApi = require('./tests-api'),
    Image = require('./image');

var DEFAULT_CFG_NAME = '.gemini.yml',
    DEFAULT_SPECS_DIR = 'gemini';

function requireWithNoCache(moduleName) {
    var result = require(moduleName);
    delete require.cache[moduleName];
    return result;
}

function Gemini(config) {
    this.config = config;
    this.readSuite = function(paths) {
        paths = paths || [DEFAULT_SPECS_DIR];
        return pathUtils.expandPaths(paths)
            .then(function(expanded) {
                var rootSuite = Suite.create('');
                exposeTestsApi(publicApi, rootSuite);

                expanded.forEach(requireWithNoCache);
                return rootSuite;
            });
    };

    this.gather = function(paths, options) {
        if (!options) {
            options = paths;
            paths = [DEFAULT_SPECS_DIR];
        }
        return this.readSuite(paths)
            .then(function(suite) {
                var shooter = new ScreenShooter(config);
                return shooter.run(suite);
            });
    };

    this.test = function(paths, options) {
        if (!options) {
            options = paths;
            paths = [DEFAULT_SPECS_DIR];
        }
        options = options || {};
        options.reporters = options.reporters || [];
        return this.readSuite(paths)
            .then(function(suite) {
                var tester = new Tester(config, {
                    tempDir: options.tempDir
                });
                options.reporters.forEach(function(reporter) {
                    applyReporter(tester, reporter);
                });
                return tester.run(suite);
            });
    };

    this.getScreenshotPath = function(suite, stateName, browserId) {
        return config.getScreenshotPath(suite, stateName, browserId);
    };

    this.buildDiff = function(referencePath, currentPath, diffPath) {
        return Image.buildDiff({
            reference: referencePath,
            current: currentPath,
            diff: diffPath,
            diffColor: config.diffColor
        });
    };

    this.getBrowserCapabilites = function(browserId) {
        return config.browsers[browserId];
    };

    Object.defineProperty(this, 'browserIds', {
        enumerable: true,
        get: function() {
            return Object.keys(config.browsers);
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
    } else if (typeof reporter !== 'function') {
        throw new TypeError('Reporter must be a string or a function');
    }

    reporter(runner);
}

function createConfig(config, overrides) {
    if (!config) {
        return Config.readYAMLFile(DEFAULT_CFG_NAME, overrides);
    } else if (typeof config === 'string') {
        return Config.readYAMLFile(config, overrides);
    } else if (typeof config === 'object') {
        return q.resolve(new Config('', config, overrides));
    } else {
        return q.reject(new TypeError('config must be a path or an object'));
    }
}

exports.create = function(config, overrides) {
    return createConfig(config, overrides)
        .then(function(config) {
            return new Gemini(config);
        });
};
