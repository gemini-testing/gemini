'use strict';

const utils = require('lib/utils');
const pathUtils = require('lib/path-utils');
const proxyquire = require('proxyquire');
const _ = require('lodash');
const q = require('q');
const EventEmitter = require('events').EventEmitter;

describe('test-reader', () => {
    const sandbox = sinon.sandbox.create();
    const testsApi = sandbox.stub();

    let readTests;

    beforeEach(() => {
        sandbox.stub(utils, 'requireWithNoCache');
        sandbox.stub(pathUtils);
        readTests = proxyquire('lib/test-reader', {
            './tests-api': testsApi
        });
    });

    afterEach(() => {
        sandbox.restore();
        testsApi.reset();
    });

    const readTests_ = (opts) => {
        const REQUIRED_OPTS = {
            system: {
                projectRoot: '/root'
            }
        };


        opts = _.defaults(opts || {}, {
            paths: [],
            config: {},
            emitter: new EventEmitter()
        });

        opts.config = _.merge(opts.config, REQUIRED_OPTS);

        return readTests(opts.paths, opts.config, opts.emitter);
    };

    describe('global "gemini" variable', () => {
        let gemini;
        let config;

        beforeEach(() => {
            config = {
                getBrowserIds: () => []
            };
            utils.requireWithNoCache.restore();
        });

        it('should use global "gemini" variable', () => {
            sandbox.stub(utils, 'requireWithNoCache', () => gemini = global.gemini);

            const api = {suite: 'api'};

            testsApi.returns(api);
            pathUtils.expandPaths.returns(q(['some-test.js']));

            return readTests_({config: config})
                .then(() => assert.deepEqual(gemini, api));
        });

        it('should rewrite global "gemini" variable for each file', () => {
            let gemini = [];

            pathUtils.expandPaths.returns(q(['/some/path/file1.js', '/some/path/file2.js']));

            testsApi
                .onFirstCall().returns({suite: 'apiInstance'})
                .onSecondCall().returns({suite: 'anotherApiInstance'});

            sandbox.stub(utils, 'requireWithNoCache', () => {
                gemini.push(global.gemini.suite);
            });

            return readTests_({config: config})
                .then(() => assert.deepEqual(gemini, ['apiInstance', 'anotherApiInstance']));
        });

        it('should delete global "gemini" variable after test reading', () => {
            testsApi.returns({suite: 'api'});
            pathUtils.expandPaths.returns(q(['some-test.js']));
            sandbox.stub(utils, 'requireWithNoCache');

            return readTests_({config: config})
                .then(() => assert.notProperty(global, 'gemini'));
        });
    });

    it('should not load any suites if no paths or sets specified', () => {
        pathUtils.expandPaths.returns(q([]));

        return readTests_()
            .then(() => assert.notCalled(utils.requireWithNoCache));
    });

    it('should expand passed paths', () => {
        pathUtils.expandPaths.returns(q([]));

        return readTests_({paths: ['some/path/*']})
            .then(() => assert.calledWithExactly(pathUtils.expandPaths, ['some/path/*']));
    });

    it('should expand paths from config.sets', () => {
        pathUtils.expandPaths.returns(q([]));

        const config = {
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
            .then(() => {
                assert.calledWithExactly(pathUtils.expandPaths, ['some/files'], '/root');
                assert.calledWithExactly(pathUtils.expandPaths, ['other/files'], '/root');
            });
    });

    it('should load suites related to passed paths', () => {
        const config = {
            getBrowserIds: () => []
        };

        pathUtils.expandPaths
            .withArgs(['some/path']).returns(q(['/some/path/file1.js', '/some/path/file2.js']));

        return readTests_({paths: ['some/path'], config: config})
            .then(() => {
                assert.calledWith(utils.requireWithNoCache, '/some/path/file1.js');
                assert.calledWith(utils.requireWithNoCache, '/some/path/file2.js');
            });
    });

    it('should load suites related to sets if no passed paths', () => {
        const config = {
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
            .then(() => {
                assert.calledThrice(utils.requireWithNoCache);
                assert.calledWith(utils.requireWithNoCache, '/some/path/file1.js');
                assert.calledWith(utils.requireWithNoCache, '/some/path/file2.js');
                assert.calledWith(utils.requireWithNoCache, '/other/path/file3.js');
            });
    });

    it('should load only passed paths', () => {
        const config = {
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
            .then(() => {
                assert.calledWith(utils.requireWithNoCache, '/some/path/file1.js');
                assert.calledWith(utils.requireWithNoCache, '/some/path/file2.js');
                assert.neverCalledWith(utils.requireWithNoCache, '/some/other/path/file3.js');
            });
    });

    it('should configure suite for certain browsers', () => {
        const config = {
            sets: {
                all: {
                    files: ['some/path'],
                    browsers: ['b1']
                }
            }
        };

        pathUtils.expandPaths.withArgs(['some/path']).returns(q(['/some/path/file.js']));

        return readTests_({config: config})
            .then(() => {
                assert.calledWith(testsApi, sinon.match.any, ['b1']);
                assert.callOrder(testsApi, utils.requireWithNoCache);
            });
    });

    it('should configure suite for all browsers if file not configured in sets', () => {
        const config = {
            sets: {
                all: {
                    files: ['some/path'],
                    browsers: ['b1']
                }
            },
            getBrowserIds: () => ['b1', 'b2']
        };

        pathUtils.expandPaths
            .withArgs(['some/path']).returns(q(['/some/path/file.js']))
            .withArgs(['other/path']).returns(q(['/other/path/file2.js']));

        return readTests_({paths: ['other/path'], config: config})
            .then(() => {
                assert.calledOnce(testsApi);
                assert.calledWith(testsApi, sinon.match.any, ['b1', 'b2']);
            });
    });

    describe('events', () => {
        function readTestsWithEmitter(absolutePath, emitter) {
            const relativePath = 'some/path';

            const config = {
                sets: {
                    all: {
                        files: relativePath
                    }
                }
            };

            pathUtils.expandPaths
                .withArgs(relativePath).returns(q([absolutePath]));

            return readTests_({
                paths: [relativePath],
                emitter: emitter,
                config: config
            });
        }

        it('should emit "beforeFileRead" before reading each file', () => {
            const filePath = '/some/path/file.js';
            const beforeReadSpy = sandbox.spy().named('OnBeforeFileRead');

            const emitter = new EventEmitter();
            emitter.on('beforeFileRead', beforeReadSpy);

            return readTestsWithEmitter(filePath, emitter)
                .then(() => {
                    assert.calledWithExactly(beforeReadSpy, filePath);
                    assert.callOrder(beforeReadSpy, utils.requireWithNoCache);
                });
        });


        it('should emit "afterFileRead" after reading each file', () => {
            const filePath = '/some/path/file.js';
            const afterReadSpy = sandbox.spy().named('OnAfterFileRead');

            const emitter = new EventEmitter();
            emitter.on('afterFileRead', afterReadSpy);

            return readTestsWithEmitter(filePath, emitter)
                .then(() => {
                    assert.calledWithExactly(afterReadSpy, filePath);
                    assert.callOrder(utils.requireWithNoCache, afterReadSpy);
                });
        });
    });
});
