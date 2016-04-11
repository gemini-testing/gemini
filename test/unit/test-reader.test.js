'use strict';

var utils = require('../../lib/utils'),
    pathUtils = require('../../lib/path-utils'),
    proxyquire = require('proxyquire'),
    _ = require('lodash'),
    q = require('q');

describe('test-reader', function() {
    var sandbox = sinon.sandbox.create(),
        testsApi = sandbox.stub(),
        readTests;

    before(function() {
        readTests = proxyquire('../../lib/test-reader', {
            './tests-api': testsApi
        });
    });

    beforeEach(function() {
        sandbox.stub(utils);
        sandbox.stub(pathUtils);
    });

    afterEach(function() {
        sandbox.restore();
        testsApi.reset();
    });

    function readTests_(opts) {
        var REQUIRED_OPTS = {
            system: {
                projectRoot: '/root'
            }
        };

        opts = _.defaults(opts || {}, {
            paths: [],
            config: {}
        });

        opts.config = _.merge(opts.config, REQUIRED_OPTS);

        return readTests(opts.paths, opts.config);
    }

    describe('global "gemini" variable', function() {
        var config;

        beforeEach(function() {
            config = {
                getBrowserIds: function() {
                    return [];
                }
            };
            utils.requireWithNoCache.restore();
        });

        it('should use global "gemini" variable', function() {
            var gemini,
                api = {suite: 'api'};

            testsApi.returns(api);
            pathUtils.expandPaths.returns(q(['some-test.js']));
            sandbox.stub(utils, 'requireWithNoCache', function() {
                gemini = global.gemini;
            });

            return readTests_({config: config})
                .then(function() {
                    assert.deepEqual(gemini, api);
                });
        });

        it('should rewrite global "gemini" variable for each file', function() {
            var gemini = [];

            pathUtils.expandPaths.returns(q(['/some/path/file1.js', '/some/path/file2.js']));
            testsApi
                .onFirstCall().returns({suite: 'apiInstance'})
                .onSecondCall().returns({suite: 'anotherApiInstance'});
            sandbox.stub(utils, 'requireWithNoCache', function() {
                gemini.push(global.gemini.suite);
            });

            return readTests_({config: config})
                .then(function() {
                    assert.deepEqual(gemini, ['apiInstance', 'anotherApiInstance']);
                });
        });

        it('should delete global "gemini" variable after test reading', function() {
            testsApi.returns({suite: 'api'});
            pathUtils.expandPaths.returns(q(['some-test.js']));
            sandbox.stub(utils, 'requireWithNoCache');

            return readTests_({config: config})
                .then(function() {
                    assert.notProperty(global, 'gemini');
                });
        });
    });

    it('should not load any suites if no paths or sets specified', function() {
        pathUtils.expandPaths
            .returns(q([]));

        return readTests_()
            .then(function() {
                assert.notCalled(utils.requireWithNoCache);
            });
    });

    it('should expand passed paths', function() {
        pathUtils.expandPaths
            .returns(q([]));

        return readTests_({paths: ['some/path/*']})
            .then(function() {
                assert.calledWithExactly(pathUtils.expandPaths, ['some/path/*']);
            });
    });

    it('should expand paths from config.sets', function() {
        pathUtils.expandPaths
            .returns(q([]));

        var config = {
            system: {
                projectRoot: '/root'
            },
            sets: {
                set1: {
                    files: ['some/files']
                },
                set2: {
                    files: ['other/files']
                }
            }
        };

        return readTests_({config: config})
            .then(function() {
                assert.calledWithExactly(pathUtils.expandPaths, ['some/files'], '/root');
                assert.calledWithExactly(pathUtils.expandPaths, ['other/files'], '/root');
            });
    });

    it('should load suites related to passed paths', function() {
        var config = {
            getBrowserIds: function() {
                return [];
            }
        };

        pathUtils.expandPaths
            .withArgs(['some/path']).returns(q(['/some/path/file1.js', '/some/path/file2.js']));

        return readTests_({paths: ['some/path'], config: config})
            .then(function() {
                assert.calledWith(utils.requireWithNoCache, '/some/path/file1.js');
                assert.calledWith(utils.requireWithNoCache, '/some/path/file2.js');
            });
    });

    it('should load suites related to sets if no passed paths', function() {
        var config = {
            sets: {
                set1: {
                    files: ['some/path']
                },
                set2: {
                    files: ['other/path']
                }
            }
        };

        pathUtils.expandPaths
            .withArgs(['some/path']).returns(q(['/some/path/file1.js', '/some/path/file2.js']))
            .withArgs(['other/path']).returns(q(['/other/path/file3.js']))
            .withArgs([]).returns(q([]));

        return readTests_({config: config})
            .then(function() {
                assert.calledThrice(utils.requireWithNoCache);
                assert.calledWith(utils.requireWithNoCache, '/some/path/file1.js');
                assert.calledWith(utils.requireWithNoCache, '/some/path/file2.js');
                assert.calledWith(utils.requireWithNoCache, '/other/path/file3.js');
            });
    });

    it('should load only passed paths', function() {
        var config = {
            sets: {
                all: {
                    files: ['some/path', 'some/other/path']
                }
            }
        };

        pathUtils.expandPaths
            .withArgs(['some/path']).returns(q(['/some/path/file1.js', '/some/path/file2.js']))
            .withArgs(['some/path', 'some/other/path'])
            .returns(q(['/some/path/file1.js', '/some/path/file2.js', '/some/other/path/file3.js']));

        return readTests_({paths: ['some/path'], config: config})
            .then(function() {
                assert.calledWith(utils.requireWithNoCache, '/some/path/file1.js');
                assert.calledWith(utils.requireWithNoCache, '/some/path/file2.js');
                assert.neverCalledWith(utils.requireWithNoCache, '/some/other/path/file3.js');
            });
    });

    it('should configure suite for certain browsers', function() {
        var config = {
            sets: {
                all: {
                    files: ['some/path'],
                    browsers: ['b1']
                }
            }
        };

        pathUtils.expandPaths
            .withArgs(['some/path']).returns(q(['/some/path/file.js']));

        return readTests_({config: config})
            .then(function() {
                assert.calledWith(testsApi, sinon.match.any, ['b1']);
                assert.callOrder(testsApi, utils.requireWithNoCache);
            });
    });

    it('should configure suite for all browsers if file not configured in sets', function() {
        var config = {
            sets: {
                all: {
                    files: ['some/path'],
                    browsers: ['b1']
                }
            },
            getBrowserIds: function() {
                return ['b1', 'b2'];
            }
        };

        pathUtils.expandPaths
            .withArgs(['some/path']).returns(q(['/some/path/file.js']))
            .withArgs(['other/path']).returns(q(['/other/path/file2.js']));

        return readTests_({paths: ['other/path'], config: config})
            .then(function() {
                assert.calledOnce(testsApi);
                assert.calledWith(testsApi, sinon.match.any, ['b1', 'b2']);
            });
    });
});
