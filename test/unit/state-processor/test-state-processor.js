'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const CaptureSession = require('lib/capture-session');
const StateProcessor = require('lib/state-processor/state-processor');
const TestStateProcessor = require('lib/state-processor/test-state-processor');
const {Image} = require('gemini-core');
const util = require('../../util');

describe('state-processor/test-state-processor', () => {
    const sandbox = sinon.sandbox.create();

    const mkTestStateProc_ = () => {
        const config = _.set({}, 'system.diffColor', '#ff00ff');
        return new TestStateProcessor(config);
    };

    const exec_ = (opts) => {
        opts = _.defaultsDeep(opts || {}, {
            state: util.makeStateStub(),
            browserSession: sinon.createStubInstance(CaptureSession),
            page: {},
            emit: sinon.spy()
        });

        return mkTestStateProc_().exec(opts.state, opts.browserSession, opts.page, opts.emit);
    };

    beforeEach(() => {
        sandbox.stub(StateProcessor.prototype, 'exec');
        sandbox.stub(Image, 'buildDiff');
    });

    afterEach(() => sandbox.restore());

    describe('exec', () => {
        it('should call base class exec method with correct args', () => {
            const state = util.makeStateStub();
            const page = {};
            const browserSession = sinon.createStubInstance(CaptureSession);

            StateProcessor.prototype.exec.returns(Promise.resolve({}));

            return exec_({state, browserSession, page})
                .then(() => {
                    assert.calledWithExactly(StateProcessor.prototype.exec, state, browserSession, page);
                });
        });

        it('should return result from calling base class exec method', () => {
            const result = {equal: true};

            StateProcessor.prototype.exec.returns(Promise.resolve(result));

            return exec_()
                .then(() => {
                    assert.eventually.deepEqual(StateProcessor.prototype.exec.getCall(0).returnValue, result);
                });
        });

        it('should emit "TEST_RESULT" event with "saveDiffTo" func when images aren\'t equal', () => {
            const result = {equal: false};
            const emit = sandbox.stub();

            StateProcessor.prototype.exec.returns(Promise.resolve(result));

            return exec_({emit})
                .then(() => {
                    assert.calledWithExactly(emit, 'testResult', _.extend(result, {saveDiffTo: () => {}}));
                });
        });

        it('should emit "TEST_RESULT" event without "saveDiffTo" func when images are equal', () => {
            const result = {equal: true};
            const emit = sandbox.stub();

            StateProcessor.prototype.exec.returns(Promise.resolve(result));

            return exec_({emit})
                .then(() => {
                    assert.calledWithExactly(emit, 'testResult', result);
                });
        });

        describe('should build diff image with', () => {
            const mkBrowserSession_ = (opts = {}) => _.set({}, 'browser.config', opts);
            const mkResult_ = (opts = {}) => {
                return _.defaults(opts, {
                    equal: false,
                    refImg: {path: '/default-ref/path'},
                    currImg: {path: '/default-curr/path'}
                });
            };

            it('options from "buildDiffOpts"', () => {
                const result = mkResult_();
                const buildDiffOpts = {foo: 'bar', baz: 'qux'};
                const browserSession = mkBrowserSession_({buildDiffOpts});
                const emit = sandbox.stub();

                StateProcessor.prototype.exec.returns(Promise.resolve(result));

                return exec_({emit, browserSession})
                    .then(() => {
                        result.saveDiffTo();

                        assert.calledOnceWith(
                            Image.buildDiff,
                            sinon.match({foo: 'bar', baz: 'qux'})
                        );
                    });
            });

            it('with overriden option from "buildDiffOpts"', () => {
                const result = mkResult_({tolerance: 100500});
                const buildDiffOpts = {tolerance: 500100};
                const browserSession = mkBrowserSession_({buildDiffOpts});
                const emit = sandbox.stub();

                StateProcessor.prototype.exec.returns(Promise.resolve(result));

                return exec_({emit, browserSession})
                    .then(() => {
                        result.saveDiffTo();

                        assert.calledOnceWith(
                            Image.buildDiff,
                            sinon.match({tolerance: 500100})
                        );
                    });
            });
        });
    });
});
