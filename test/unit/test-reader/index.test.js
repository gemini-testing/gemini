'use strict';

const proxyquire = require('proxyquire');
const _ = require('lodash');
const q = require('q');
const EventEmitter = require('events').EventEmitter;
const utils = require('lib/utils');
const pathUtils = require('lib/test-reader/path-utils');

describe('test-reader', () => {
    const sandbox = sinon.sandbox.create();
    const testsApi = sandbox.stub();

    let readTests;

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

        return readTests({paths: opts.paths, sets: opts.cliSets}, opts.config, opts.emitter);
    };

    beforeEach(() => {
        sandbox.stub(utils, 'requireWithNoCache');
        sandbox.stub(pathUtils, 'expandPaths').returns(q([]));

        readTests = proxyquire('lib/test-reader', {
            '../tests-api': testsApi
        });
    });

    afterEach(() => {
        sandbox.restore();
        testsApi.reset();
    });

    describe('global "gemini" variable', () => {
        let gemini;
        let config;

        beforeEach(() => {
            config = {
                sets: {
                    set: {
                        files: ['some/files']
                    }
                },
                getBrowserIds: () => []
            };

            utils.requireWithNoCache.restore();
        });

        it('should use global "gemini" variable', () => {
            sandbox.stub(utils, 'requireWithNoCache', () => gemini = global.gemini);

            const api = {suite: 'api'};

            testsApi.returns(api);
            pathUtils.expandPaths.returns(q(['some-test.js']));

            return readTests_({config})
                .then(() => assert.deepEqual(gemini, api));
        });

        it('should rewrite global "gemini" variable for each file', () => {
            let globalGemini = [];

            pathUtils.expandPaths.returns(q(['/some/path/file1.js', '/some/path/file2.js']));

            testsApi
                .onFirstCall().returns({suite: 'apiInstance'})
                .onSecondCall().returns({suite: 'anotherApiInstance'});

            sandbox.stub(utils, 'requireWithNoCache', () => {
                globalGemini.push(global.gemini.suite);
            });

            return readTests_({config})
                .then(() => assert.deepEqual(globalGemini, ['apiInstance', 'anotherApiInstance']));
        });

        it('should delete global "gemini" variable after test reading', () => {
            testsApi.returns({suite: 'api'});
            pathUtils.expandPaths.returns(q(['some-test.js']));
            sandbox.stub(utils, 'requireWithNoCache');

            return readTests_({config}).then(() => assert.notProperty(global, 'gemini'));
        });
    });

    it('should load suites related to sets from config', () => {
        const config = {
            sets: {
                set: {
                    files: ['some/path']
                }
            }
        };

        pathUtils.expandPaths
            .withArgs(['some/path']).returns(q(['/some/path/file1.js', '/some/path/file2.js']));

        return readTests_({config})
            .then(() => {
                assert.calledWith(utils.requireWithNoCache, '/some/path/file1.js');
                assert.calledWith(utils.requireWithNoCache, '/some/path/file2.js');
            });
    });

    it('should load suites related to sets from cli', () => {
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

        pathUtils.expandPaths.withArgs(['some/path']).returns(q(['/some/path/file1.js']));

        return readTests_({cliSets: ['set1'], config})
            .then(() => assert.alwaysCalledWithExactly(utils.requireWithNoCache, '/some/path/file1.js'));
    });

    it('should load suites related to paths from cli', () => {
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
            .withArgs(['some/path']).returns(q(['/some/path/file1.js']));

        return readTests_({paths: ['some/path'], config})
            .then(() => {
                assert.alwaysCalledWithExactly(utils.requireWithNoCache, '/some/path/file1.js');
            });
    });

    it('should load suites related to sets and paths from cli', () => {
        const config = {
            sets: {
                set1: {
                    files: ['some/path', 'other/path']
                }
            }
        };

        pathUtils.expandPaths
            .withArgs(['some/path']).returns(q(['/some/path/file1.js']))
            .withArgs(['some/path', 'other/path']).returns(q(['/some/path/file1.js', '/other/path/file2.js']));

        return readTests_({cliSets: ['set1'], paths: ['some/path'], config})
            .then(() => {
                assert.calledWith(utils.requireWithNoCache, '/some/path/file1.js');
                assert.neverCalledWith(utils.requireWithNoCache, '/other/path/file2.js');
            });
    });

    it('should not load suites if sets do not constan paths from cli', () => {
        const config = {
            sets: {
                set1: {
                    files: ['some/path']
                }
            }
        };

        return readTests_({paths: ['other/path'], config})
            .then(() => assert.notCalled(utils.requireWithNoCache));
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
