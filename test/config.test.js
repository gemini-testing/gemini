'use strict';
var Config = require('../lib/config'),
    assert = require('chai').assert,
    GeminiError = require('../lib/errors/gemini-error'),
    createSuite = require('../lib/suite').create,
    sinon = require('sinon'),
    _ = require('lodash');

describe('config', function() {
    function createConfig(props, overrides) {
        var validProps = _.extend({
            projectRoot: './',
            rootUrl: 'http://example.com/root',
            gridUrl: 'http://example.com/root'
        }, props);
        return new Config(validProps, overrides);
    }

    beforeEach(function() {
        this.sinon = sinon.sandbox.create();
    });

    afterEach(function() {
        this.sinon.restore();
    });

    describe('projectRoot', function() {
        it('should be required when creating config from object', function() {
            assert.throws(function() {
                return new Config({
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com'
                });
            }, GeminiError);
        });

        it('should resolve relative paths relatively to cwd', function() {
            this.sinon.stub(process, 'cwd').returns('/some/path');
            var config = createConfig({
                projectRoot: './rel/path'
            });
            assert.equal(config.projectRoot, '/some/path/rel/path');
        });

        it('should leave absolute path unchanged', function() {
            var config = createConfig({
                projectRoot: '/some/absolute/path'
            });

            assert.equal(config.projectRoot, '/some/absolute/path');
        });
    });

    describe('sourceRoot', function() {
        it('should be equal to projectRoot by default', function() {
            var config = createConfig({
                projectRoot: '/some/absolute/path'
            });

            assert.equal(config.sourceRoot, '/some/absolute/path');
        });

        it('should resolve relative paths relatively to projectRoot', function() {
            var config = createConfig({
                projectRoot: '/root',
                sourceRoot: './rel/path'
            });
            assert.equal(config.sourceRoot, '/root/rel/path');
        });

        it('should leave absolute path unchanged', function() {
            var config = createConfig({
                projectRoot: '/root',
                sourceRoot: '/some/absolute/path'
            });

            assert.equal(config.sourceRoot, '/some/absolute/path');
        });
    });

    describe('rootUrl', function() {
        it('should be required', function() {
            assert.throws(function() {
                return new Config({
                    projectRoot: '/',
                    gridUrl: 'http://example.com'
                });
            }, GeminiError);
        });

        it('should accept strings', function() {
            var config = createConfig({
                rootUrl: 'http://example.com'
            });
            assert.equal(config.rootUrl, 'http://example.com');
        });

        it('should be overridable', function() {
            var config = createConfig({
                rootUrl: 'http://example.com'
            }, {
                rootUrl: 'http://example.org'
            });

            assert.equal(config.rootUrl, 'http://example.org');
        });

        it('should be settable via environment variable GEMINI_ROOT_URL', function() {
            stubProcessEnv(this.sinon, {GEMINI_ROOT_URL: 'http://example.org'});

            var config = createConfig({
                rootUrl: 'http://example.com'
            });
            assert.equal(config.rootUrl, 'http://example.org');
        });
    });

    describe('gridUrl', function() {
        it('should be required is there are non-phantomjs browsers', function() {
            assert.throws(function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    browsers: {
                        phantomjs: 'phantomjs',
                        nonPhantomjs: 'non-phantomjs'
                    }
                });
            }, GeminiError);
        });

        it('should not be required if there are only phantomjs browser', function() {
            assert.doesNotThrow(function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    browsers: {
                        phantomjs: 'phantomjs'
                    }
                });
            });
        });

        it('should accept string', function() {
            var config = createConfig({
                gridUrl: 'http://grid.example.com'
            });
            assert.equal(config.gridUrl, 'http://grid.example.com');
        });

        it('should be overridable', function() {
            var config = createConfig({
                gridUrl: 'http://grid.example.com'
            }, {
                gridUrl: 'http://grid.example.org'
            });
            assert.equal(config.gridUrl, 'http://grid.example.org');
        });

        it('should be settable via environment variable GEMINI_GRID_URL', function() {
            stubProcessEnv(this.sinon, {GEMINI_GRID_URL: 'http://example.org'});

            var config = createConfig({
                gridUrl: 'http://example.com'
            });
            assert.equal(config.gridUrl, 'http://example.org');
        });
    });

    describe('browsers', function() {
        it('should accept objects', function() {
            var config = createConfig({
                browsers: {
                    someBrowser: {
                        browserName: 'bro',
                        capability: 'cap'
                    }
                }
            });

            assert.deepEqual(config.browsers, {
                someBrowser: {
                    browserName: 'bro',
                    capability: 'cap'
                }
            });
        });

        it('should transform "id: name" to valid capabilites', function() {
            var config = createConfig({
                browsers: {
                    someBrowser: 'bro'
                }
            });

            assert.deepEqual(config.browsers, {
                someBrowser: {
                    browserName: 'bro'
                }
            });
        });

        it('should throw on legacy array', function() {
            assert.throws(function() {
                createConfig({
                    browsers: [
                        {name: 'bro'},
                        {name: 'bro2', version: '12.0'},
                        'bro3'
                    ]
                });
            }, GeminiError);
        });

        it('should be phantomjs by default', function() {
            var config = createConfig();
            assert.deepEqual(config.browsers, {
                phantomjs: {
                    browserName: 'phantomjs'
                }
            });
        });

        it('should throw if not object nor array', function() {
            assert.throws(function() {
                createConfig({
                    browsers: 'yep!'
                });
            }, GeminiError);
        });
    });

    describe('capabilities', function() {
        it('should be copied as is', function() {
            var config = createConfig({
                capabilities: {
                    option: 'value',
                    option2: 'other value'
                }
            });

            assert.deepEqual(config.capabilities, {
                option: 'value',
                option2: 'other value'
            });
        });

        it('should not allow set `takesScreenshot` capability', function() {
            assert.throws(function() {
                createConfig({
                    capabilities: {
                        takesScreenshot: true
                    }
                });
            }, GeminiError);
        });
    });

    describe('http', function() {
        it('should be passed only timeout, retries and retryDelay options', function() {
            var config = createConfig({
                http: {
                    timeout: 1000,
                    retries: 5,
                    retryDelay: 25,
                    invalid: 'ignored'
                }
            });

            assert.deepEqual(config.http, {
                timeout: 1000,
                retries: 5,
                retryDelay: 25
            });
        });

        it('should not accept non-number timeout', function() {
            assert.throws(function() {
                createConfig({
                    http: {
                        timeout: 'not a number'
                    }
                });
            }, GeminiError);
        });

        it('should not accept non-number retires', function() {
            assert.throws(function() {
                createConfig({
                    http: {
                        retries: 'not a number'
                    }
                });
            }, GeminiError);
        });

        it('should not accept non-number retryDelay', function() {
            assert.throws(function() {
                createConfig({
                    http: {
                        retryDelay: 'not a number'
                    }
                });
            }, GeminiError);
        });
    });

    describe('parallelLimit', function() {
        it('should not accept non-numbers', function() {
            assert.throws(function() {
                createConfig({
                    parallelLimit: 'so many'
                });
            }, GeminiError);
        });

        it('should not accept negative numbers', function() {
            assert.throws(function() {
                createConfig({
                    parallelLimit: -1
                });
            }, GeminiError);
        });

        it('should not accept float numbers', function() {
            assert.throws(function() {
                createConfig({
                    parallelLimit: 1.1
                });
            }, GeminiError);
        });

        it('should copy non-negative integer', function() {
            var config = createConfig({
                parallelLimit: 3
            });
            assert.equal(config.parallelLimit, 3);
        });
    });

    describe('sessionMode', function() {
        it('should be "perBrowser" by default', function() {
            var config = createConfig();
            assert.equal(config.sessionMode, 'perBrowser');
        });

        it('should accept "perBrowser" value', function() {
            var config = createConfig({
                sessionMode: 'perBrowser'
            });
            assert.equal(config.sessionMode, 'perBrowser');
        });

        it('should accept "perSuite" value', function() {
            var config = createConfig({
                sessionMode: 'perSuite'
            });
            assert.equal(config.sessionMode, 'perSuite');
        });

        it('should not accept any other value', function() {
            assert.throws(function() {
                createConfig({
                    sessionMode: 'other'
                });
            }, GeminiError);
        });
    });

    describe('tolerance', function() {
        it('should not accept non-numbers', function() {
            assert.throws(function() {
                createConfig({
                    tolerance: 'very tolerant'
                });
            }, GeminiError);
        });

        it('should accept numbers', function() {
            var config = createConfig({
                tolerance: 2.8
            });
            assert.equal(config.tolerance, 2.8);
        });

        it('should be 2.3 by default', function() {
            var config = createConfig();
            assert.equal(config.tolerance, 2.3);
        });
    });

    describe('strictComparison', function() {
        it('should not accept non-boolean', function() {
            assert.throws(function() {
                createConfig({
                    strictComparison: 'of course!'
                });
            }, GeminiError);
        });

        it('should accept boolean', function() {
            var config = createConfig({
                strictComparison: true
            });
            assert.equal(config.strictComparison, true);
        });

        it('should be false by default', function() {
            var config = createConfig();
            assert.equal(config.strictComparison, false);
        });
    });

    describe('diffColor', function() {
        it('should be magenta by default', function() {
            var config = createConfig();
            assert.equal(config.diffColor, '#ff00ff');
        });

        it('should not accept non-strings', function() {
            assert.throws(function() {
                createConfig({
                    diffColor: 123
                });
            }, GeminiError);
        });

        it('should not accept non-colors', function() {
            assert.throws(function() {
                createConfig({
                    diffColor: 'purple'
                });
            }, GeminiError);
        });

        it('should accept hexadecimal colors', function() {
            var config = createConfig({
                diffColor: '#ff0000'
            });
            assert.equal(config.diffColor, '#ff0000');
        });
    });

    describe('debug', function() {
        it('should not accept non-boolean', function() {
            assert.throws(function() {
                createConfig({
                    debug: 'very much'
                });
            }, GeminiError);
        });

        it('should accept true', function() {
            var config = createConfig({
                debug: true
            });
            assert.equal(config.debug, true);
        });

        it('should accept false', function() {
            var config = createConfig({
                debug: false
            });
            assert.equal(config.debug, false);
        });

        it('should be settable via environment variable GEMINI_DEBUG', function() {
            stubProcessEnv(this.sinon, {GEMINI_DEBUG: true});

            var config = createConfig({
                debug: false
            });
            assert.equal(config.debug, true);
        });
    });

    describe('screenshotsDir', function() {
        it('should not accept non-string value', function() {
            assert.throws(function() {
                createConfig({
                    screenshotsDir: 12.5
                });
            }, GeminiError);
        });

        it('should be a file path resolved relative to root', function() {
            var config = createConfig({
                projectRoot: '/some/path',
                screenshotsDir: 'screens'
            });
            assert.equal(config.screenshotsDir, '/some/path/screens');
        });

        it('should be gemini/screens by default', function() {
            var config = createConfig({projectRoot: '/some/path'});
            assert.equal(config.screenshotsDir, '/some/path/gemini/screens');
        });

        it('should be settable via environment variable GEMINI_SCREENSHOTS_DIR', function() {
            stubProcessEnv(this.sinon, {GEMINI_SCREENSHOTS_DIR: '/some/path/gemini/screens'});

            var config = createConfig({
                screenshotsDir: '/root'
            });
            assert.equal(config.screenshotsDir, '/some/path/gemini/screens');
        });
    });

    describe('getAbsoluteUrl', function() {
        it('should resolve url relative to root', function() {
            var config = createConfig({rootUrl: 'http://example.com/path/'}),
                url = config.getAbsoluteUrl('sub/path');
            assert.equal(url, 'http://example.com/path/sub/path');
        });

        it('should ignore slash at the end of the root', function() {
            var config = createConfig({rootUrl: 'http://example.com/path'}),
                url = config.getAbsoluteUrl('sub/path');
            assert.equal(url, 'http://example.com/path/sub/path');
        });

        it('should ignore slash at the begining of the passed relUrl', function() {
            var config = createConfig({rootUrl: 'http://example.com/path/'}),
                url = config.getAbsoluteUrl('/sub/path');
            assert.equal(url, 'http://example.com/path/sub/path');
        });
    });

    describe('getScreenshotsDir', function() {
        it('should return path for simple suite and state', function() {
            var config = createConfig({projectRoot: '/root'}),
                suite = createSuite('suite'),
                dir = config.getScreenshotsDir(suite, 'state');

            assert.equal(dir, '/root/gemini/screens/suite/state');
        });

        it('should return path for nested suite and state', function() {
            var config = createConfig({projectRoot: '/root'}),
                parent = createSuite('parent'),
                child = createSuite('child', parent),
                dir = config.getScreenshotsDir(child, 'state');

            assert.equal(dir, '/root/gemini/screens/parent/child/state');
        });

        it('should take "screenshotsDir" setting into account', function() {
            var config = createConfig({
                projectRoot: '/root',
                screenshotsDir: 'myscreens'
            });

            var suite = createSuite('suite'),
                dir = config.getScreenshotsDir(suite, 'state');

            assert.equal(dir, '/root/myscreens/suite/state');
        });
    });

    describe('getScreenshotPath', function() {
        it('should return path to the image', function() {
            var config = createConfig({projectRoot: '/root'}),
                suite = createSuite('suite'),
                path = config.getScreenshotPath(suite, 'state', 'browser');
            assert.equal(path, '/root/gemini/screens/suite/state/browser.png');
        });
    });

    describe('unknown option', function() {
        it('should be reported as error', function() {
            assert.throws(function() {
                createConfig({
                    unknownOption: 'value'
                });
            }, GeminiError);
        });
    });

    describe('windowSize', function() {
        it('should not accept non-string value', function() {
            assert.throws(function() {
                createConfig({
                    windowSize: 100
                });
            }, GeminiError);
        });

        it('should not accept string in invalid format', function() {
            assert.throws(function() {
                createConfig({
                    windowSize: 'abc'
                });
            }, GeminiError);
        });

        it('should be {width: x, height: y} object', function() {
            var config = createConfig({
                windowSize: '1000x2000'
            });
            assert.deepEqual(config.windowSize, {width: 1000, height: 2000});
        });

        it('should be settable via environment variable GEMINI_WINDOW_SIZE', function() {
            stubProcessEnv(this.sinon, {GEMINI_WINDOW_SIZE: '1000x2000'});

            var config = createConfig({
                windowSize: '100x200'
            });
            assert.deepEqual(config.windowSize, {width: 1000, height: 2000});
        });
    });

    describe('coverageExclude', function() {
        it('should be empty array by default', function() {
            var config = createConfig();

            assert.deepEqual(config.coverageExclude, []);
        });

        it('should not accept non array values', function() {
            assert.throws(function() {
                createConfig({
                    coverageExclude: {}
                });
            }, GeminiError);

            assert.throws(function() {
                createConfig({
                    coverageExclude: ''
                });
            }, GeminiError);

            assert.throws(function() {
                createConfig({
                    coverageExclude: true
                });
            }, GeminiError);
        });

        it('should accept array values', function() {
            var exclude = ['libs/**', 'examples/**'],
                config = createConfig({
                    coverageExclude: exclude
                });

            assert.deepEqual(config.coverageExclude, exclude);
        });
    });

    describe('coverageNoHtml', function() {
        it('should not accept non-boolean', function() {
            assert.throws(function() {
                createConfig({
                    coverageNoHtml: 'of course!'
                });
            }, GeminiError);
        });

        it('should accept boolean', function() {
            var config = createConfig({
                coverageNoHtml: true
            });
            assert.isTrue(config.coverageNoHtml);
        });

        it('should be false by default', function() {
            var config = createConfig({});
            assert.isFalse(config.coverageNoHtml);
        });

        it('should be settable via overrides', function() {
            var config = createConfig({
                coverageNoHtml: true
            }, {
                coverageNoHtml: false
            });

            assert.isFalse(config.coverageNoHtml);
        });

        it('should be settable via environment variable GEMINI_COVERAGE_NO_HTML', function() {
            stubProcessEnv(this.sinon, {GEMINI_COVERAGE_NO_HTML: true});

            var config = createConfig({
                coverageNoHtml: false
            });
            assert.isTrue(config.coverageNoHtml);
        });
    });
    describe('referenceImageAbsence', function() {
        it('should not accept invalid values', function() {
            assert.throws(function() {
                createConfig({
                    referenceImageAbsence: 'invalid value'
                });
            }, GeminiError);
        });

        ['error', 'warning'].forEach(function(value) {
            it('should accept ' + value, function() {
                var config = createConfig({
                    referenceImageAbsence: value
                });
                assert.equal(config.referenceImageAbsence, value);
            });
        });

        it('should be error by default', function() {
            var config = createConfig();
            assert.equal(config.referenceImageAbsence, 'error');
        });
    });
});

function stubProcessEnv(sinon, props) {
    sinon.stub(process, 'env', _.extend({}, process.env, props));
}
