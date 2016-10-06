'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const CaptureSession = require('lib/capture-session');
const StateProcessor = require('lib/state-processor/state-processor');
const TestStateProcessor = require('lib/state-processor/test-state-processor');
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

    beforeEach(() => sandbox.stub(StateProcessor.prototype, 'exec'));

    afterEach(() => sandbox.restore());

    describe('exec', () => {
        it('should call base class exec method with correct args', () => {
            const state = util.makeStateStub();
            const page = {};
            const browserSession = sinon.createStubInstance(CaptureSession);

            StateProcessor.prototype.exec.returns(Promise.resolve({}));

            return mkTestStateProc_().exec(state, browserSession, page, sinon.spy())
                .then(() => {
                    assert.calledWithExactly(StateProcessor.prototype.exec, state, browserSession, page);
                });
        });

        it('should return result from calling base class exec method', () => {
            const result = {equal: true};

            StateProcessor.prototype.exec.returns(Promise.resolve(result));

            return exec_()
                .then(() => {
                    assert.eventually.equal(StateProcessor.prototype.exec.getCall(0).returnValue, result);
                });
        });

        it('should emit TEST_RESULT event with saveDiffTo func when images aren\'t equal', () => {
            const result = {equal: false};
            const emit = sandbox.stub();

            StateProcessor.prototype.exec.returns(Promise.resolve(result));

            return exec_({emit})
                .then(() => {
                    assert.calledWithExactly(emit, 'testResult', _.extend(result, {saveDiffTo: () => {}}));
                });
        });

        it('should emit TEST_RESULT event with diff results when images are equal', () => {
            const result = {equal: true};
            const emit = sandbox.stub();

            StateProcessor.prototype.exec.returns(Promise.resolve(result));

            return exec_({emit})
                .then(() => assert.calledWithExactly(emit, 'testResult', result));
        });

        it('should emit TEST_RESULT event without saveDiffTo func when images are equal', () => {
            const emit = sandbox.stub();

            StateProcessor.prototype.exec.returns(Promise.resolve({equal: true}));

            return exec_({emit})
                .then(() => assert.notProperty(emit.getCall(0).args[1], 'saveDiffTo'));
        });
    });
});
