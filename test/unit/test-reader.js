'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const EventEmitter = require('events').EventEmitter;
const globExtra = require('glob-extra');
const SetsBuilder = require('gemini-core').SetsBuilder;

const utils = require('lib/utils');

describe('test-reader', () => {
    const sandbox = sinon.sandbox.create();

    let testsApi;
    let readTests;

    const mkConfigStub = (opts) => {
        opts = opts || {};

        return _.defaultsDeep(opts, {
            getBrowserIds: sandbox.stub().returns(opts.browsers || []),
            system: {
                projectRoot: '/root'
            }
        });
    };

    const readTests_ = (params) => {
        params = _.defaultsDeep(params || {}, {
            config: mkConfigStub(),
            emitter: new EventEmitter(),
            options: {
                sets: {},
                paths: [],
                browsers: []
            }
        });

        return readTests(params.emitter, params.config, params.options);
    };

    beforeEach(() => {
        sandbox.stub(utils, 'requireWithNoCache');
        sandbox.stub(globExtra, 'expandPaths').returns(Promise.resolve([]));
        sandbox.stub(SetsBuilder.prototype, 'useFiles').returnsThis();
        sandbox.stub(SetsBuilder.prototype, 'useSets').returnsThis();
        sandbox.stub(SetsBuilder.prototype, 'useBrowsers').returnsThis();

        const groupByFile = () => {
            return {
                '/some/path/file1.js': [],
                '/other/path/file2.js': []
            };
        };
        sandbox.stub(SetsBuilder.prototype, 'build').returns(Promise.resolve({groupByFile}));
        testsApi = sandbox.stub();
        readTests = proxyquire('lib/test-reader', {
            './tests-api': testsApi
        });
    });

    afterEach(() => sandbox.restore());

    describe('SetsBuilder calling', () => {
        let createSetsBuilder;

        beforeEach(() => createSetsBuilder = sandbox.spy(SetsBuilder, 'create'));

        it('should create set-builder with sets from config and default directory', () => {
            const defaultDir = require('../../package').name;
            const opts = {
                config: mkConfigStub({
                    sets: {
                        all: {}
                    }
                })
            };

            return readTests_(opts)
                .then(() => {
                    assert.calledOnce(createSetsBuilder);
                    assert.calledWithMatch(createSetsBuilder, {all: {}}, {defaultDir});
                });
        });

        it('should use sets passed from cli', () => {
            return readTests_({options: {sets: {all: {}}}})
                .then(() => {
                    assert.calledOnce(SetsBuilder.prototype.useSets);
                    assert.calledWith(SetsBuilder.prototype.useSets, {all: {}});
                });
        });

        it('should use paths passed from cli', () => {
            return readTests_({options: {paths: ['some/path']}})
                .then(() => {
                    assert.calledOnce(SetsBuilder.prototype.useFiles);
                    assert.calledWith(SetsBuilder.prototype.useFiles, ['some/path']);
                });
        });

        it('should use browsers passed from cli', () => {
            return readTests_({options: {browsers: ['bro1']}})
                .then(() => {
                    assert.calledOnce(SetsBuilder.prototype.useBrowsers);
                    assert.calledWith(SetsBuilder.prototype.useBrowsers, ['bro1']);
                });
        });

        it('should build set-collection using project root and exlude options from config', () => {
            const config = mkConfigStub({
                system: {
                    projectRoot: '/project/root',
                    exclude: ['some/path']
                }
            });

            return readTests_({config})
                .then(() => {
                    assert.calledOnce(SetsBuilder.prototype.build);
                    assert.calledWith(SetsBuilder.prototype.build, '/project/root', {ignore: ['some/path']});
                });
        });

        it('should call set-builder methods in right order', () => {
            return readTests_()
                .then(() => {
                    assert.callOrder(
                        createSetsBuilder,
                        SetsBuilder.prototype.useSets,
                        SetsBuilder.prototype.useFiles,
                        SetsBuilder.prototype.useBrowsers,
                        SetsBuilder.prototype.build
                    );
                });
        });

        it('should call "testsApi" with absolute file path', () => {
            const groupByFile = () => ({'/project/root/path/file1.js': []});

            SetsBuilder.prototype.build.returns(Promise.resolve({groupByFile}));

            return readTests_()
                .then(() => {
                    assert.calledWith(testsApi, sinon.match.any, sinon.match.any, '/project/root/path/file1.js');
                });
        });

        it('should call "testsApi" with a config', () => {
            const config = mkConfigStub();

            return readTests_({config})
                .then(() => assert.calledWith(testsApi, sinon.match.any, sinon.match.any, sinon.match.any, config));
        });
    });

    describe('global "gemini" variable', () => {
        let gemini;

        beforeEach(() => {
            utils.requireWithNoCache.restore();
        });

        it('should use global "gemini" variable', () => {
            sandbox.stub(utils, 'requireWithNoCache', () => gemini = global.gemini);
            const api = {suite: 'api'};

            testsApi.returns(api);

            return readTests_()
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

            return readTests_()
                .then(() => assert.deepEqual(globalGemini, ['apiInstance', 'anotherApiInstance']));
        });

        it('should delete global "gemini" variable after test reading', () => {
            testsApi.returns({suite: 'api'});
            globExtra.expandPaths.returns(Promise.resolve(['some-test.js']));
            sandbox.stub(utils, 'requireWithNoCache');

            return readTests_().then(() => assert.notProperty(global, 'gemini'));
        });
    });

    describe('events', () => {
        it('should emit "beforeFileRead" before reading each file', () => {
            const beforeReadSpy = sandbox.spy().named('OnBeforeFileRead');

            const emitter = new EventEmitter();
            emitter.on('beforeFileRead', beforeReadSpy);

            return readTests_({emitter})
                .then(() => {
                    assert.calledWithExactly(beforeReadSpy, '/some/path/file1.js');
                    assert.callOrder(beforeReadSpy, utils.requireWithNoCache);
                });
        });

        it('should emit "afterFileRead" after reading each file', () => {
            const afterReadSpy = sandbox.spy().named('OnAfterFileRead');

            const emitter = new EventEmitter();
            emitter.on('afterFileRead', afterReadSpy);

            return readTests_({emitter})
                .then(() => {
                    assert.calledWithExactly(afterReadSpy, '/some/path/file1.js');
                    assert.callOrder(utils.requireWithNoCache, afterReadSpy);
                });
        });
    });
});
