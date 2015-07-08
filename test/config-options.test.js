'use strict';
var Config = require('../lib/config'),
    parser = require('../lib/config/options'),
    assert = require('chai').assert,
    GeminiError = require('../lib/errors/gemini-error'),
    MissingOptionError = require('gemini-configparser').MissingOptionError,
    sinon = require('sinon'),
    _ = require('lodash');

describe('config', function() {
    var VALID_OPTIONS = {
        system: {
            projectRoot: '/some/path'
        },
        rootUrl: 'http://example.com/root',
        gridUrl: 'http://example.com/root',
        desiredCapabilities: {},
        browsers: {
            browser: {}
        }
    };
    function parseConfig(options) {
        return parser({
            options: options,
            env: {},
            argv: []
        });
    }

    function createConfig(props) {
        var validProps = _.merge({}, VALID_OPTIONS, props);
        return parseConfig(validProps);
    }

    function assertParsesEnv(opts) {
        var result = parser({
            options: VALID_OPTIONS,
            env: _.set({}, 'gemini_' + _.snakeCase(opts.property), opts.value),
            argv: []
        });

        assert.deepEqual(_.get(result, opts.property), opts.expected);
    }

    function assertParsesCli(opts) {
        var result = parser({
            options: VALID_OPTIONS,
            env: {},
            argv: [
                '--' + _.kebabCase(opts.property),
                opts.value
            ]
        });

        assert.deepEqual(_.get(result, opts.property), opts.expected);
    }

    function testPositiveIntegerOption(name, opts) {
        it('should not accept non-numbers', function() {
            assert.throws(function() {
                createConfig(_.set({}, name, 'so many'));
            }, GeminiError);
        });

        it('should not accept negative numbers', function() {
            assert.throws(function() {
                createConfig(_.set({}, name, -1));
            }, GeminiError);
        });

        it('should not accept 0', function() {
            assert.throws(function() {
                createConfig(_.set({}, name, 0));
            }, GeminiError);
        });

        it('should not accept float numbers', function() {
            assert.throws(function() {
                createConfig(_.set({}, name, 1.1));
            }, GeminiError);
        });

        it('should copy positive integer', function() {
            var config = createConfig(_.set({}, name, 3));
            assert.deepPropertyVal(config, name, 3);
        });

        it('should correctly parse env var', function() {
            assertParsesEnv({
                property: name,
                value: '100',
                expected: 100
            });
        });

        it('should correctly parse cli flag', function() {
            assertParsesCli({
                property: name,
                value: '100',
                expected: 100
            });
        });

        it('should be ' + opts.default + ' by default', function() {
            var config = createConfig({});
            assert.deepPropertyVal(config, name, opts.default);
        });
    }

    function testBooleanOption(name, opts) {
        it('should not accept non-boolean', function() {
            assert.throws(function() {
                createConfig(_.set({}, name, 'very much'));
            }, GeminiError);
        });

        it('should accept true', function() {
            var config = createConfig(_.set({}, name, true));
            assert.deepPropertyVal(config, name, true);
        });

        it('should accept false', function() {
            var config = createConfig(_.set({}, name, false));
            assert.deepPropertyVal(config, name, false);
        });

        it('should be ' + opts.default + ' by default', function() {
            var config = createConfig({});
            assert.deepPropertyVal(config, name, opts.default);
        });

        it('should accept "yes" env var value as true', function() {
            assertParsesEnv({
                property: name,
                value: 'yes',
                expected: true
            });
        });

        it('should accept "1" env var value as true', function() {
            assertParsesEnv({
                property: name,
                value: '1',
                expected: true
            });
        });

        it('should accept "true" env var value as true', function() {
            assertParsesEnv({
                property: name,
                value: 'true',
                expected: true
            });
        });

        it('should accept "no" env var value as false', function() {
            assertParsesEnv({
                property: name,
                value: 'no',
                expected: false
            });
        });

        it('should accept "0" env var value as false', function() {
            assertParsesEnv({
                property: name,
                value: '0',
                expected: false
            });
        });

        it('should accept "false" env var value as false', function() {
            assertParsesEnv({
                property: name,
                value: 'false',
                expected: false
            });
        });

        it('should accept "yes" cli flag value as true', function() {
            assertParsesCli({
                property: name,
                value: 'yes',
                expected: true
            });
        });

        it('should accept "1" cli flag value as true', function() {
            assertParsesCli({
                property: name,
                value: '1',
                expected: true
            });
        });

        it('should accept "true" cli flag value as true', function() {
            assertParsesCli({
                property: name,
                value: 'true',
                expected: true
            });
        });

        it('should accept "no" cli flag value as false', function() {
            assertParsesCli({
                property: name,
                value: 'no',
                expected: false
            });
        });

        it('should accept "0" env cli flag as false', function() {
            assertParsesCli({
                property: name,
                value: '0',
                expected: false
            });
        });

        it('should accept "false" cli flag value as false', function() {
            assertParsesCli({
                property: name,
                value: 'false',
                expected: false
            });
        });
    }

    beforeEach(function() {
        this.sinon = sinon.sandbox.create();
    });

    afterEach(function() {
        this.sinon.restore();
    });

    describe('system section', function() {
        describe('projectRoot', function() {
            it('should be required when creating config from object', function() {
                assert.throws(function() {
                    return new Config({
                        system: {
                        },
                        browsers: {}
                    });
                }, MissingOptionError);
            });

            it('should resolve relative paths relatively to cwd', function() {
                this.sinon.stub(process, 'cwd').returns('/some/path');
                var config = createConfig({
                    system: {
                        projectRoot: './rel/path'
                    }
                });
                assert.equal(config.system.projectRoot, '/some/path/rel/path');
            });

            it('should leave absolute path unchanged', function() {
                var config = createConfig({
                    system: {
                        projectRoot: '/some/absolute/path'
                    }
                });

                assert.equal(config.system.projectRoot, '/some/absolute/path');
            });
        });

        describe('sourceRoot', function() {
            it('should be equal to projectRoot by default', function() {
                var config = createConfig({
                    system: {
                        projectRoot: '/some/absolute/path'
                    }
                });

                assert.equal(config.system.sourceRoot, '/some/absolute/path');
            });

            it('should resolve relative paths relatively to projectRoot', function() {
                var config = createConfig({
                    system: {
                        projectRoot: '/root',
                        sourceRoot: './rel/path'
                    }
                });
                assert.equal(config.system.sourceRoot, '/root/rel/path');
            });

            it('should leave absolute path unchanged', function() {
                var config = createConfig({
                    system: {
                        projectRoot: '/root',
                        sourceRoot: '/some/absolute/path'
                    }
                });

                assert.equal(config.system.sourceRoot, '/some/absolute/path');
            });
        });

        describe('debug', function() {
            testBooleanOption('system.debug', {default: false});
        });

        describe('parallelLimit', function() {
            testPositiveIntegerOption('system.parallelLimit', {default: Infinity});
        });

        describe('referenceImageAbsence', function() {
            it('should not accept invalid values', function() {
                assert.throws(function() {
                    createConfig({
                        system: {
                            referenceImageAbsence: 'invalid value'
                        }
                    });
                }, GeminiError);
            });

            ['error', 'warning'].forEach(function(value) {
                it('should accept ' + value, function() {
                    var config = createConfig({
                        system: {
                            referenceImageAbsence: value
                        }
                    });
                    assert.equal(config.system.referenceImageAbsence, value);
                });
            });

            it('should be error by default', function() {
                var config = createConfig();
                assert.equal(config.system.referenceImageAbsence, 'error');
            });
        });

        describe('diffColor', function() {
            it('should be magenta by default', function() {
                var config = createConfig();
                assert.equal(config.system.diffColor, '#ff00ff');
            });

            it('should not accept non-strings', function() {
                assert.throws(function() {
                    createConfig({
                        system: {
                            diffColor: 123
                        }
                    });
                }, GeminiError);
            });

            it('should not accept non-colors', function() {
                assert.throws(function() {
                    createConfig({
                        system: {
                            diffColor: 'purple'
                        }
                    });
                }, GeminiError);
            });

            it('should accept hexadecimal colors', function() {
                var config = createConfig({
                    system: {
                        diffColor: '#ff0000'
                    }
                });
                assert.equal(config.system.diffColor, '#ff0000');
            });
        });

        describe('coverage', function() {
            describe('enabled', function() {
                testBooleanOption('system.coverage.enabled', {default: false});
            });

            describe('html', function() {
                testBooleanOption('system.coverage.html', {default: true});
            });

            describe('exclude', function() {
                it('should be [] by default', function() {
                    var config = createConfig();
                    assert.deepEqual(config.system.coverage.exclude, []);
                });

                it('should not accept non-arrays', function() {
                    assert.throws(function() {
                        createConfig({
                            system: {
                                coverage: {
                                    exclude: 'everything'
                                }
                            }
                        });
                    }, GeminiError);
                });

                it('should not accept non-string items', function() {
                    assert.throws(function() {
                        createConfig({
                            system: {
                                coverage: {
                                    exclude: [
                                        99999
                                    ]
                                }
                            }
                        });
                    }, GeminiError);
                });

                it('should accept string items', function() {
                    var config = createConfig({
                        system: {
                            coverage: {
                                exclude: [
                                    'path1',
                                    'path2'
                                ]
                            }
                        }
                    });

                    assert.deepEqual(config.system.coverage.exclude, [
                        'path1',
                        'path2'
                    ]);
                });
            });
        });
    });

    describe('browser options', function() {
        function createBrowserConfig(config) {
            return createConfig({
                browsers: {
                    browser: _.merge({
                        desiredCapabilities: {}
                    }, config)
                }
            }).browsers.browser;
        }

        function shouldBeSettableFromTopLevel(property, value) {
            it('should be settable from top-level', function() {
                var config = createConfig(_.set({
                    browsers: {
                        browser: {
                            desiredCapabilities: {}
                        }
                    }
                }, property, value));

                assert.propertyVal(config.browsers.browser, property, value);
            });
        }

        function shouldOverrideTopLevelValue(property, values) {
            it('should override top-level value', function() {
                var config = createConfig(_.set({
                    browsers: {
                        browser: _.set({
                            desiredCapabilities: {}
                        }, property, values.browser)
                    }
                }, property, values.top));

                assert.propertyVal(config.browsers.browser, property, values.browser);
            });
        }

        describe('rootUrl', function() {
            it('should fail if not set', function() {
                assert.throws(function() {
                    parseConfig({
                        system: {projectRoot: '/'},
                        browsers: {
                            browser: {
                                desiredCapabilities: {},
                                gridUrl: 'http://grid.example.com'
                            }
                        }
                    });
                }, MissingOptionError);
            });

            it('should not accept non-string', function() {
                assert.throws(function() {
                    createBrowserConfig({
                        rootUrl: 234
                    });
                }, GeminiError);
            });

            it('should accept strings', function() {
                var config = createBrowserConfig({
                    rootUrl: 'http://example.com'
                });
                assert.equal(config.rootUrl, 'http://example.com');
            });

            shouldBeSettableFromTopLevel('rootUrl', 'http://top.example.com');
            shouldOverrideTopLevelValue('rootUrl', {
                top: 'http://top.example.com',
                browser: 'http://browser.example.com'
            });
        });

        describe('gridUrl', function() {
            it('should be required', function() {
                assert.throws(function() {
                    return parseConfig({
                        system: {projectRoot: '/'},
                        browsers: {
                            browser: {
                                desiredCapabilities: {},
                                rootUrl: 'http://grid.example.com'
                            }
                        }
                    });
                }, MissingOptionError);
            });

            it('should not accept non-string', function() {
                assert.throws(function() {
                    createBrowserConfig({
                        gridUrl: 234
                    });
                }, GeminiError);
            });

            it('should accept strings', function() {
                var config = createBrowserConfig({
                    gridUrl: 'http://example.com'
                });
                assert.equal(config.gridUrl, 'http://example.com');
            });

            shouldBeSettableFromTopLevel('gridUrl', 'http://top.example.com');
            shouldOverrideTopLevelValue('gridUrl', {
                top: 'http://top.example.com',
                browser: 'http://browser.example.com'
            });
        });

        describe('sessionsPerBrowser', function() {
            testPositiveIntegerOption('browsers.browser.sessionsPerBrowser', {default: 1});

            shouldBeSettableFromTopLevel('sessionsPerBrowser', 3);
            shouldOverrideTopLevelValue('sessionsPerBrowser', {
                top: 2,
                browser: 100
            });
        });

        describe('suitesPerSession', function() {
            testPositiveIntegerOption('browsers.browser.suitesPerSession', {default: Infinity});

            shouldBeSettableFromTopLevel('suitesPerSession', 3);
            shouldOverrideTopLevelValue('suitesPerSession', {
                top: 2,
                browser: 100
            });
        });

        describe('tolerance', function() {
            it('should not accept non-numbers', function() {
                assert.throws(function() {
                    createBrowserConfig({
                        tolerance: 'very tolerant'
                    });
                }, GeminiError);
            });

            it('should accept numbers', function() {
                var config = createBrowserConfig({
                    tolerance: 2.8
                });
                assert.equal(config.tolerance, 2.8);
            });

            it('should be 2.3 by default', function() {
                var config = createBrowserConfig({});
                assert.equal(config.tolerance, 2.3);
            });

            shouldBeSettableFromTopLevel('tolerance', 3.0);
            shouldOverrideTopLevelValue('tolerance', {
                top: 4.0,
                browser: 5.0
            });

            it('should correctly parse env var', function() {
                assertParsesEnv({
                    property: 'browsers.browser.tolerance',
                    value: '100',
                    expected: 100
                });
            });

            it('should correctly parse cli flag', function() {
                assertParsesCli({
                    property: 'browsers.browser.tolerance',
                    value: '100',
                    expected: 100
                });
            });
        });

        describe('strictComparison', function() {
            testBooleanOption('browsers.browser.strictComparison', {default: false});

            shouldBeSettableFromTopLevel('strictComparison', true);
            shouldOverrideTopLevelValue('strictComparison', {
                top: true,
                browser: false
            });
        });

        describe('screenshotsDir', function() {
            it('should not accept non-string value', function() {
                assert.throws(function() {
                    createBrowserConfig({
                        screenshotsDir: 12.5
                    });
                }, GeminiError);
            });

            it('should be a file path resolved relative to root', function() {
                var config = createBrowserConfig({
                    screenshotsDir: 'screens'
                });
                assert.equal(config.screenshotsDir, '/some/path/screens');
            });

            it('should be gemini/screens by default', function() {
                var config = createBrowserConfig({});
                assert.equal(config.screenshotsDir, '/some/path/gemini/screens');
            });

            //TODO: toplevel
        });

        describe('calibrate', function() {
            testBooleanOption('browsers.browser.calibrate', {default: true});

            shouldBeSettableFromTopLevel('calibrate', false);
            shouldOverrideTopLevelValue('calibrate', {
                top: false,
                browser: true
            });
        });

        describe('windowSize', function() {
            it('should not accept non-string value', function() {
                assert.throws(function() {
                    createBrowserConfig({
                        windowSize: 100
                    });
                }, GeminiError);
            });

            it('should not accept string in invalid format', function() {
                assert.throws(function() {
                    createBrowserConfig({
                        windowSize: 'abc'
                    });
                }, GeminiError);
            });

            it('should be {width: x, height: y} object', function() {
                var config = createBrowserConfig({
                    windowSize: '1000x2000'
                });
                assert.deepEqual(config.windowSize, {width: 1000, height: 2000});
            });
        });

        describe('httpTimeout', function() {
            it('should accept number values', function() {
                var config = createBrowserConfig({
                    httpTimeout: 1000
                });

                assert.equal(config.httpTimeout, 1000);
            });

            it('should accept "default" value', function() {
                var config = createBrowserConfig({
                    httpTimeout: 'default'
                });

                assert.equal(config.httpTimeout, 'default');
            });

            it('should not accept non-number and not "default" value', function() {
                assert.throws(function() {
                    createBrowserConfig({
                        httpTimeout: 'lalalal'
                    });
                }, GeminiError);
            });

            it('should not accept negative value', function() {
                assert.throws(function() {
                    createBrowserConfig({
                        httpTimeout: -273
                    });
                }, GeminiError);
            });

            shouldBeSettableFromTopLevel('httpTimeout', 1234);
            shouldOverrideTopLevelValue('httpTimeout', {
                top: 1234,
                browser: 4321
            });

            it('should correctly parse env var', function() {
                assertParsesEnv({
                    property: 'browsers.browser.httpTimeout',
                    value: '100',
                    expected: 100
                });
            });

            it('should accept "default" as env var value', function() {
                assertParsesEnv({
                    property: 'browsers.browser.httpTimeout',
                    value: 'default',
                    expected: 'default'
                });
            });

            it('should correctly parse cli flag', function() {
                assertParsesCli({
                    property: 'browsers.browser.httpTimeout',
                    value: '100',
                    expected: 100
                });
            });

            it('should accept "default" as cli flag value', function() {
                assertParsesEnv({
                    property: 'browsers.browser.httpTimeout',
                    value: 'default',
                    expected: 'default'
                });
            });
        });

        describe('desiredCapabilities', function() {
            it('should accept objects', function() {
                var config = createBrowserConfig({
                    desiredCapabilities: {
                        prop: 'value'
                    }
                });

                assert.deepEqual(config.desiredCapabilities, {
                    prop: 'value'
                });
            });

            it('should not accept non-objects', function() {
                assert.throws(function() {
                    createBrowserConfig({
                        desiredCapabilities: 'so much'
                    });
                }, GeminiError);
            });

            it('should merge top-level and per-browser options', function() {
                var config = createConfig({
                    desiredCapabilities: {fromTop: 'top'},
                    browsers: {
                        browser: {
                            desiredCapabilities: {perBrowser: 'bro'}
                        }
                    }
                }).browsers.browser;

                assert.deepEqual(config.desiredCapabilities, {
                    fromTop: 'top',
                    perBrowser: 'bro'
                });
            });

            it('should allow to have no deisried capabilities in top level', function() {
                var config = createConfig({
                    desiredCapabilities: null,
                    browsers: {
                        browser: {
                            desiredCapabilities: {perBrowser: 'bro'}
                        }
                    }
                }).browsers.browser;

                assert.deepEqual(config.desiredCapabilities, {
                    perBrowser: 'bro'
                });
            });

            it('should allow not to have desiredCapabilities per-browser', function() {
                var config = createConfig({
                    desiredCapabilities: {fromTop: 'top'},
                    browsers: {
                        browser: {
                        }
                    }
                }).browsers.browser;

                assert.deepEqual(config.desiredCapabilities, {
                    fromTop: 'top'
                });
            });

            it('should require desiredCapabilities to be set in top level or per-browser', function() {
                assert.throws(function() {
                    createConfig({
                        desiredCapabilities: null,
                        browsers: {
                            browser: {
                            }
                        }
                    });
                }, GeminiError);
            });

            it('should allow to set capabilites with env var', function() {
                assertParsesEnv({
                    property: 'browsers.browser.desiredCapabilities',
                    value: '{"a":1}',
                    expected: {a: 1}
                });
            });

            it('should allow to set capabilites with cli flag', function() {
                assertParsesCli({
                    property: 'browsers.browser.desiredCapabilities',
                    value: '{"a":1}',
                    expected: {a: 1}
                });
            });
        });
    });
});
