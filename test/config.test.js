'use strict';
var Config = require('../lib/config'),
    GeminiError = require('../lib/errors/gemini-error'),
    createSuite = require('../lib/suite').create,
    sinon = require('sinon'),
    extend = require('node.extend');

describe('config', function() {
    beforeEach(function() {
        this.sinon = sinon.sandbox.create();
    });

    afterEach(function() {
        this.sinon.restore();
    });

    describe('projectRoot', function() {
        it('should be required when creating config from object', function() {
            (function() {
                return new Config({
                    rootUrl: 'http://example.com'
                });
            }.must.throw(GeminiError));
        });

        it('should resolve relative paths relatively to cwd', function() {
            this.sinon.stub(process, 'cwd').returns('/some/path');
            var config = new Config({
                projectRoot: './rel/path',
                rootUrl: 'http://example.com'
            });
            config.projectRoot.must.be('/some/path/rel/path');
        });

        it('should leave absolute path unchanged', function() {
            var config = new Config({
                projectRoot: '/some/absolute/path',
                rootUrl: 'http://example.com'
            });

            config.projectRoot.must.be('/some/absolute/path');
        });
    });

    describe('rootUrl', function() {
        it('should be required', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    gridUrl: 'http://example.com'
                });
            }.must.throw(GeminiError));
        });

        it('should accept strings', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com'
            });
            config.rootUrl.must.be('http://example.com');
        });

        it('should be overridable', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com'
            }, {
                rootUrl: 'http://example.org'
            });

            config.rootUrl.must.be('http://example.org');
        });

        it('should be settable via overrides', function() {
            var config = new Config({
                projectRoot: '/',
                gridUrl: 'http://example.com'
            }, {
                projectRoot: '/',
                rootUrl: 'http://example.org'
            });

            config.rootUrl.must.be('http://example.org');
        });

        it('should be settable via environment variable GEMINI_ROOT_URL', function() {
            stubProcessEnv(this.sinon, {GEMINI_ROOT_URL: 'http://example.org'});

            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com'
            });
            config.rootUrl.must.be('http://example.org');
        });
    });

    describe('gridUrl', function() {
        it('should be required is there are non-phantomjs browsers', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    browsers: {
                        phantomjs: 'phantomjs',
                        nonPhantomjs: 'non-phantomjs'
                    }
                });
            }.must.throw(GeminiError));
        });

        it('should not be required if there are only phantomjs browser', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    browsers: {
                        phantomjs: 'phantomjs'
                    }
                });
            }.must.not.throw());
        });

        it('should accept string', function() {
            var config = new Config({
                projectRoot: '/',
                gridUrl: 'http://grid.example.com',
                rootUrl: 'http://example.com'
            });
            config.gridUrl.must.be('http://grid.example.com');
        });

        it('should be overridable', function() {
            var config = new Config({
                projectRoot: '/',
                gridUrl: 'http://grid.example.com',
                rootUrl: 'http://example.com'
            }, {
                gridUrl: 'http://grid.example.org'
            });
            config.gridUrl.must.be('http://grid.example.org');
        });

        it('should be settable with overrides', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com'
            }, {
                gridUrl: 'http://grid.example.org'
            });
            config.gridUrl.must.be('http://grid.example.org');
        });

        it('should be settable via environment variable GEMINI_GRID_URL', function() {
            stubProcessEnv(this.sinon, {GEMINI_GRID_URL: 'http://example.org'});

            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com'
            });
            config.gridUrl.must.be('http://example.org');
        });
    });

    describe('browsers', function() {
        it('should accept objects', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                browsers: {
                    someBrowser: {
                        browserName: 'bro',
                        capability: 'cap'
                    }
                }
            });

            config.browsers.must.eql({
                someBrowser: {
                    browserName: 'bro',
                    capability: 'cap'
                }
            });
        });

        it('should transform "id: name" to valid capabilites', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                browsers: {
                    someBrowser: 'bro'
                }
            });
            config.browsers.must.eql({
                someBrowser: {
                    browserName: 'bro'
                }
            });
        });

        it('should throw on legacy array', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com',
                    browsers: [
                        {name: 'bro'},
                        {name: 'bro2', version: '12.0'},
                        'bro3'
                    ]
                });
            }.must.throw(GeminiError));
        });

        it('should be phantomjs by default', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com'
            });
            config.browsers.must.eql({
                phantomjs: {
                    browserName: 'phantomjs'
                }
            });
        });

        it('should throw if not object nor array', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com',
                    browsers: 'yep!'
                });
            }.must.throw(GeminiError));
        });
    });

    describe('capabilities', function() {
        it('should be copied as is', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                capabilities: {
                    option: 'value',
                    option2: 'other value'
                }
            });

            config.capabilities.must.eql({
                option: 'value',
                option2: 'other value'
            });
        });

        function shouldNotAllowCapability(name) {
            it('should not allow set `' + name + '` capability', function() {
                (function() {
                    var capabilites = {};
                    capabilites[name] = 'value';
                    return new Config({
                        projectRoot: '/',
                        rootUrl: 'http://example.com',
                        gridUrl: 'http://example.com',
                        capabilities: capabilites
                    });
                }.must.throw());
            });
        }

        shouldNotAllowCapability('takesScreenshot');
    });

    describe('http', function() {
        it('should be passed only timeout, retries and retryDelay options', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                http: {
                    timeout: 1000,
                    retries: 5,
                    retryDelay: 25,
                    invalid: 'ignored'
                }
            });

            config.http.must.eql({
                timeout: 1000,
                retries: 5,
                retryDelay: 25
            });
        });

        it('should not accept non-number timeout', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    http: {
                        timeout: 'not a number'
                    }
                });
            }.must.throw(GeminiError));
        });

        it('should not accept non-number retires', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    http: {
                        retries: 'not a number'
                    }
                });
            }.must.throw(GeminiError));
        });

        it('should not accept non-number retryDelay', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    http: {
                        retryDelay: 'not a number'
                    }
                });
            }.must.throw(GeminiError));
        });
    });

    describe('parallelLimit', function() {
        it('should not accept non-numbers', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com',
                    parallelLimit: 'so many'
                });
            }.must.throw(GeminiError));
        });

        it('should not accept negative numbers', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com',
                    parallelLimit: -1
                });
            }.must.throw(GeminiError));
        });

        it('should not accept float numbers', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com',
                    parallelLimit: 1.1
                });
            }.must.throw(GeminiError));
        });

        it('should copy non-negative integer', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                parallelLimit: 3
            });
            config.parallelLimit.must.be(3);
        });
    });

    describe('tolerance', function() {
        it('should throw error if set', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com',
                    tolerance: 0.01
                });
            }.must.throw(GeminiError));
        });
    });

    describe('strictComparison', function() {
        it('should not accept non-boolean', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com',
                    strictComparison: 'of course!'
                });
            }.must.throw(GeminiError));
        });

        it('should accept boolean', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                strictComparison: true
            });
            config.strictComparison.must.be(true);
        });

        it('should be false by default', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com'
            });
            config.strictComparison.must.be(false);
        });
    });

    describe('diffColor', function() {
        it('should be magenta by default', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com'
            });
            config.diffColor.must.be('#ff00ff');
        });

        it('should not accept non-strings', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com',
                    diffColor: 123
                });
            }.must.throw(GeminiError));
        });

        it('should not accept non-colors', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com',
                    diffColor: 'purple'
                });
            }.must.throw(GeminiError));
        });

        it('should accept hexadecimal colors', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                diffColor: '#ff0000'
            });
            config.diffColor.must.be('#ff0000');
        });
    });

    describe('debug', function() {
        it('should not accept non-boolean', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com',
                    debug: 'very much'
                });
            }.must.throw(GeminiError));
        });

        it('should accept true', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                debug: true
            });
            config.debug.must.be(true);
        });

        it('should accept false', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                debug: false
            });
            config.debug.must.be(false);
        });

        it('should be settable via environment variable GEMINI_DEBUG', function() {
            stubProcessEnv(this.sinon, {GEMINI_DEBUG: true});

            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                debug: false
            });
            config.debug.must.be(true);
        });
    });

    describe('screenshotsDir', function() {
        it('should not accept non-string value', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    gridUrl: 'http://example.com',
                    screenshotsDir: 12.5
                });
            }.must.throw(GeminiError));
        });

        it('should be a file path resolved relative to root', function() {
            var config = new Config({
                projectRoot: '/some/path',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                screenshotsDir: 'screens'
            });
            config.screenshotsDir.must.be('/some/path/screens');
        });

        it('should be gemini/screens by default', function() {
            var config = new Config({
                projectRoot: '/some/path',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com'
            });
            config.screenshotsDir.must.be('/some/path/gemini/screens');
        });

        it('should be settable via environment variable GEMINI_SCREENSHOTS_DIR', function() {
            stubProcessEnv(this.sinon, {GEMINI_SCREENSHOTS_DIR: '/some/path/gemini/screens'});

            var config = new Config({
                projectRoot: '/some/path',
                rootUrl: 'http://example.com',
                gridUrl: 'http://example.com',
                screenshotsDir: '/root'
            });
            config.screenshotsDir.must.be('/some/path/gemini/screens');
        });
    });

    describe('getAbsoluteUrl', function() {
        it('should resolve url relative to root', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com/path/'
            });
            config.getAbsoluteUrl('sub/path').must.be('http://example.com/path/sub/path');
        });
    });

    describe('getScreenshotsDir', function() {
        beforeEach(function() {
            this.config = new Config({
                projectRoot: '/root',
                rootUrl: 'http://example.com'
            });
        });

        it('should return path for simple suite and state', function() {
            var suite = createSuite('suite');

            this.config.getScreenshotsDir(suite, 'state').must.be('/root/gemini/screens/suite/state');
        });

        it('should return path for nested suite and state', function() {
            var parent = createSuite('parent'),
                child = createSuite('child', parent);

            this.config.getScreenshotsDir(child, 'state').must.be('/root/gemini/screens/parent/child/state');
        });

        it('should take "screenshotsDir" setting into account', function() {
            var config = new Config({
                projectRoot: '/root',
                rootUrl: 'http://example.com',
                screenshotsDir: 'myscreens'
            });

            var suite = createSuite('suite');

            config.getScreenshotsDir(suite, 'state').must.be('/root/myscreens/suite/state');
        });
    });

    describe('getScreenshotPath', function() {
        beforeEach(function() {
            this.config = new Config({
                projectRoot: '/root',
                rootUrl: 'http://example.com'
            });
        });

        it('should return path to the image', function() {
            var suite = createSuite('suite');

            this.config.getScreenshotPath(suite, 'state', 'browser').must.be(
                '/root/gemini/screens/suite/state/browser.png'
            );
        });
    });

    describe('unknown option', function() {
        it('should be reported as error', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    rootUrl: 'http://example.com',
                    unknownOption: 'value'
                });
            }.must.throw(GeminiError));
        });
    });

    describe('windowSize', function() {
        it('should not accept non-string value', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    windowSize: 100
                });
            }.must.throw(GeminiError));
        });

        it('should not accept string in invalid format', function() {
            (function() {
                return new Config({
                    projectRoot: '/',
                    windowSize: 'abc'
                });
            }.must.throw(GeminiError));
        });

        it('should be {width: x, height: y} object', function() {
            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                windowSize: '1000x2000'
            });
            config.windowSize.must.eql({width: 1000, height: 2000});
        });

        it('should be settable via environment variable GEMINI_WINDOW_SIZE', function() {
            stubProcessEnv(this.sinon, {GEMINI_WINDOW_SIZE: '1000x2000'});

            var config = new Config({
                projectRoot: '/',
                rootUrl: 'http://example.com',
                windowSize: '100x200'
            });
            config.windowSize.must.eql({width: 1000, height: 2000});
        });
    });
});

function stubProcessEnv(sinon, props) {
    sinon.stub(process, 'env', extend({}, process.env, props));
}
