'use strict';
var Config = require('../lib/config'),
    GeminiError = require('../lib/errors/gemini-error');

describe('config', function() {
    describe('rootUrl', function() {
        it('should be required', function() {
            (function() {
                return new Config('/', [
                    'gridUrl: http://example.com'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should accept strings', function() {
            var config = new Config('/', 'rootUrl: http://example.com');
            config.rootUrl.must.be('http://example.com');
        });

        it('should be overridable', function() {
            var config = new Config('/', 'rootUrl: http://example.com', {
                rootUrl: 'http://example.org'
            });

            config.rootUrl.must.be('http://example.org');
        });

        it('should be settable via overrides', function() {
            var config = new Config('/', 'gridUrl: http://example.com', {
                rootUrl: 'http://example.org'
            });

            config.rootUrl.must.be('http://example.org');
        });
    });

    describe('gridUrl', function() {
        it('should be required is there are non-phantomjs browsers', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'browsers:',
                    '  phantomjs: phantomjs',
                    '  non-phantomjs: non-phantomjs'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should not be required if there are only phantomjs browser', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'browsers:',
                    '  phantomjs: phantomjs'
                ].join('\n'));
            }.must.not.throw());
        });

        it('should accept string', function() {
            var config = new Config('/', [
                'gridUrl: http://grid.example.com',
                'rootUrl: http://example.com'
            ].join('\n'));
            config.gridUrl.must.be('http://grid.example.com');
        });

        it('should be overridable', function() {
            var config = new Config('/', [
                'gridUrl: http://grid.example.com',
                'rootUrl: http://example.com'
            ].join('\n'), {
                gridUrl: 'http://grid.example.org'
            });
            config.gridUrl.must.be('http://grid.example.org');
        });

        it('should be settable with overrides', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com'
            ].join('\n'), {
                gridUrl: 'http://grid.example.org'
            });
            config.gridUrl.must.be('http://grid.example.org');
        });
    });

    describe('browsers', function() {
        it('should accept objects', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'browsers:',
                '  someBrowser:',
                '    browserName: bro',
                '    capability: cap'
            ].join('\n'));
            config.browsers.must.eql({
                someBrowser: {
                    browserName: 'bro',
                    capability: 'cap'
                }
            });
        });

        it('should transform "id: name" to valid capabilites', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'browsers:',
                '  someBrowser: bro'
            ].join('\n'));
            config.browsers.must.eql({
                someBrowser: {
                    browserName: 'bro'
                }
            });
        });

        it('should accept legacy array', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'browsers:',
                '  - {name: bro}',
                '  - {name: bro2, version: "12.0"}',
                '  - bro3'
            ].join('\n'));
            config.browsers.must.eql({
                bro: {
                    browserName: 'bro'
                },
                'bro2-v12.0': {
                    browserName: 'bro2',
                    version: '12.0'
                },

                bro3: {
                    browserName: 'bro3'
                }
            });
        });

        it('should be phantomjs by default', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com'
            ].join('\n'));
            config.browsers.must.eql({
                phantomjs: {
                    browserName: 'phantomjs'
                }
            });
        });

        it('should throw if not object nor array', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'browsers: yep!'
                ].join('\n'));
            }.must.throw(GeminiError));
        });
    });

    describe('capabilities', function() {
        it('should be copied as is', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'capabilities:',
                '  option: value',
                '  option2: other value'
            ].join('\n'));

            config.capabilities.must.eql({
                option: 'value',
                option2: 'other value'
            });
        });

        function shouldNotAllowCapability(name) {
            it('should not allow set `' + name + '` capability', function() {
                (function() {
                    return new Config('/', [
                        'rootUrl: http://example.com',
                        'gridUrl: http://example.com',
                        'capabilities:',
                        '  ' + name + ': value'
                    ].join('\n'));
                }.must.throw());
            });
        }

        shouldNotAllowCapability('takesScreenshot');
    });

    describe('http', function() {
        it('should be passed only timeout, retries and retryDelay options', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'http:',
                '  timeout: 1000',
                '  retries: 5',
                '  retryDelay: 25',
                '  invalid: ignored'
            ].join('\n'));

            config.http.must.eql({
                timeout: 1000,
                retries: 5,
                retryDelay: 25
            });
        });

        it('should not accept non-number timeout', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'http:',
                    '  timeout: not a number'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should not accept non-number retires', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'http:',
                    '  retries: not a number'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should not accept non-number retryDelay', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'http:',
                    '  retryDelay: not a number'
                ].join('\n'));
            }.must.throw(GeminiError));
        });
    });

    describe('parallelLimit', function() {
        it('should not accept non-numbers', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'parallelLimit: so many'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should not accept negative numbers', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'parallelLimit: -1'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should not accept float numbers', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'parallelLimit: 1.1'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should copy non-negative integer', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'parallelLimit: 3'
            ].join('\n'));
            config.parallelLimit.must.be(3);
        });
    });

    describe('tolerance', function() {
        it('should not accept non-numbers', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'tolerance: zero!'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should not accept number higher then 1', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'tolerance: 1.1'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should not accept number lower then 0', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'tolerance: -0.1'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should accept numbers between 0 and 1', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'tolerance: 0.01'
            ].join('\n'));

            config.tolerance.must.be(0.01);
        });

        it('should be Number.MIN_VALUE by default', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com'
            ].join('\n'));

            config.tolerance.must.be(Number.MIN_VALUE);
        });
    });

    describe('diffColor', function() {
        it('should be magenta by default', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com'
            ].join('\n'));
            config.diffColor.must.be('#ff00ff');
        });

        it('should not accept non-strings', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'diffColor: 123'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should not accept non-colors', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'diffColor: purple'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should accept hexadecimal colors', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'diffColor: "#ff0000"'
            ].join('\n'));
            config.diffColor.must.be('#ff0000');
        });
    });

    describe('debug', function() {
        it('should not accept non-boolean', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'debug: very much'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should accept true', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'debug: true'
            ].join('\n'));
            config.debug.must.be(true);
        });

        it('should accept false', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'debug: false'
            ].join('\n'));
            config.debug.must.be(false);
        });
    });

    describe('screenshotsDir', function() {
        it('should not accept non-string value', function() {
            (function() {
                return new Config('/', [
                    'rootUrl: http://example.com',
                    'gridUrl: http://example.com',
                    'screenshotsDir: 12.5'
                ].join('\n'));
            }.must.throw(GeminiError));
        });

        it('should be a file path resolved relative to root', function() {
            var config = new Config('/some/path/config.yml', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'screenshotsDir: screens'
            ].join('\n'));
            config.screenshotsDir.must.be('/some/path/screens');
        });

        it('should be gemini/screens by default', function() {
            var config = new Config('/some/path/config.yml', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com'
            ].join('\n'));
            config.screenshotsDir.must.be('/some/path/gemini/screens');
        });
    });
});
