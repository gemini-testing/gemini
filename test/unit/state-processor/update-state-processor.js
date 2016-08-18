'use strict';

const _ = require('lodash');
const q = require('q');

const CaptureSession = require('lib/capture-session');
const StateProcessor = require('lib/state-processor/state-processor');
const UpdateStateProcessor = require('lib/state-processor/update-state-processor');
const util = require('../../util');

describe('state-processor/update-state-processor', () => {
    const sandbox = sinon.sandbox.create();

    let BrowserSession;

    const exec_ = (opts) => {
        opts = _.defaultsDeep(opts || {}, {
            state: util.makeStateStub(),
            page: {},
            emit: sinon.spy()
        });

        return new UpdateStateProcessor().exec(opts.state, BrowserSession, opts.page, opts.emit);
    };

    beforeEach(() => {
        sandbox.stub(StateProcessor.prototype, 'exec');
        BrowserSession = sinon.createStubInstance(CaptureSession);
    });

    afterEach(() => sandbox.restore());

    describe('exec', () => {
        it('should call StateProcessor.exec with state, browserSession and page', () => {
            const state = util.makeStateStub();
            const page = {};

            StateProcessor.prototype.exec.returns(q({}));

            return exec_({state, page})
                .then(() => {
                    assert.calledWithExactly(StateProcessor.prototype.exec, state, BrowserSession, page);
                });
        });

        it('should emit UPDATE_RESULT event with results of updating', () => {
            const result = {updated: true};
            const emit = sandbox.stub();

            StateProcessor.prototype.exec.returns(q(result));

            return exec_({emit})
                .then(() => assert.calledWithExactly(emit, 'updateResult', result));
        });
    });
});
