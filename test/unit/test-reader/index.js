'use strict';

const proxyquire = require('proxyquire');
const _ = require('lodash');
const Promise = require('bluebird');
const EventEmitter = require('events').EventEmitter;
const utils = require('lib/utils');
const globExtra = require('glob-extra');

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

        return readTests({paths: opts.paths, sets: opts.sets}, opts.config, opts.emitter);
    };

    beforeEach(() => {
        sandbox.stub(utils, 'requireWithNoCache');
        sandbox.stub(globExtra, 'expandPaths').returns(Promise.resolve([]));

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
            globExtra.expandPaths.returns(Promise.resolve(['some-test.js']));

            return readTests_({config})
                .then(() => assert.deepEqual(gemini, api));
        });

        it('should rewrite global "gemini" variable for each file', () => {
            let globalGemini = [];

            globExtra.expandPaths.returns(Promise.resolve(['/some/path/file1.js', '/some/path/file2.js']));

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
            globExtra.expandPaths.returns(Promise.resolve(['some-test.js']));
            sandbox.stub(utils, 'requireWithNoCache');

            return readTests_({config}).then(() => assert.notProperty(global, 'gemini'));
        });
    });

    it('should use gemini folder if sets are not specified in config and paths are not passed', () => {
        const config = {
            getBrowserIds: () => []
        };

        globExtra.expandPaths.withArgs(['/root/gemini']).returns(Promise.resolve(['/root/gemini/file.js']));

        return readTests_({config})
            .then(() => assert.calledWith(utils.requireWithNoCache, '/root/gemini/file.js'));
    });

    it('should load suites related to sets from config', () => {
        const config = {
            sets: {
                set: {
                    files: ['some/path']
                }
            }
        };

        globExtra.expandPaths
            .withArgs(['some/path']).returns(Promise.resolve(['/some/path/file1.js', '/some/path/file2.js']));

        return readTests_({config})
            .then(() => {
                assert.calledWith(utils.requireWithNoCache, '/some/path/file1.js');
                assert.calledWith(utils.requireWithNoCache, '/some/path/file2.js');
            });
    });

    it('should load suites related to sets from opts', () => {
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

        globExtra.expandPaths.withArgs(['some/path']).returns(Promise.resolve(['/some/path/file1.js']));

        return readTests_({sets: ['set1'], config})
            .then(() => assert.alwaysCalledWithExactly(utils.requireWithNoCache, '/some/path/file1.js'));
    });

    it('should load suites related to paths from opts', () => {
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

        globExtra.expandPaths
            .withArgs(['some/path']).returns(Promise.resolve(['/some/path/file1.js']));

        return readTests_({paths: ['some/path'], config})
            .then(() => {
                assert.alwaysCalledWithExactly(utils.requireWithNoCache, '/some/path/file1.js');
            });
    });

    it('should load suites related to sets and paths from opts', () => {
        const config = {
            sets: {
                set1: {
                    files: ['some/path', 'other/path']
                }
            }
        };

        globExtra.expandPaths
            .withArgs(['some/path']).returns(Promise.resolve(['/some/path/file1.js']))
            .withArgs(['some/path', 'other/path']).returns(Promise.resolve(['/some/path/file1.js', '/other/path/file2.js']));

        return readTests_({sets: ['set1'], paths: ['some/path'], config})
            .then(() => {
                assert.calledWith(utils.requireWithNoCache, '/some/path/file1.js');
                assert.neverCalledWith(utils.requireWithNoCache, '/other/path/file2.js');
            });
    });

    it('should throw error if sets do not contain paths from opts', () => {
        const config = {
            sets: {
                set1: {
                    files: ['some/path']
                }
            }
        };

        return assert.isRejected(readTests_({paths: ['other/path'], config}), /Cannot find files/);
    });

    describe('files of sets are specified as masks', () => {
        it('should load suites related to paths from opts', () => {
            const config = {
                sets: {
                    set1: {
                        files: ['some/**']
                    },
                    set2: {
                        files: ['other/**']
                    }
                }
            };

            globExtra.expandPaths
                .withArgs(['some/path/*.js']).returns(Promise.resolve(['/root/some/path/file1.js']));

            return readTests_({paths: ['some/path/*.js'], config})
                .then(() => {
                    assert.alwaysCalledWithExactly(utils.requireWithNoCache, '/root/some/path/file1.js');
                });
        });

        it('should load suites related to sets and paths from opts', () => {
            const config = {
                sets: {
                    set1: {
                        files: ['{*,other}/path/*.js', 'another/**']
                    }
                }
            };

            globExtra.expandPaths.withArgs(['some/path/*']).returns(Promise.resolve(['/root/some/path/file1.js']));

            return readTests_({sets: ['set1'], paths: ['some/path/*'], config})
                .then(() => assert.calledWith(utils.requireWithNoCache, '/root/some/path/file1.js'));
        });

        it('should throw error if sets do not contain paths from opts', () => {
            const config = {
                sets: {
                    set1: {
                        files: ['some/*']
                    }
                }
            };

            globExtra.expandPaths.withArgs(['other/path']).returns(Promise.resolve(['/root/other/path/file1.js']));

            return assert.isRejected(readTests_({paths: ['other/path'], config}), /Cannot find files/);
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

            globExtra.expandPaths
                .withArgs(relativePath).returns(Promise.resolve([absolutePath]));

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
