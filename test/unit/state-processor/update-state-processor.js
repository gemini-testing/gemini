'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const CaptureSession = require('lib/capture-session');
const StateProcessor = require('lib/state-processor/state-processor');
const UpdateStateProcessor = require('lib/state-processor/update-state-processor');
const util = require('../../util');

describe('state-processor/update-state-processor', () => {
    const sandbox = sinon.sandbox.create();

    const exec_ = (opts) => {
        opts = _.defaultsDeep(opts || {}, {
            state: util.makeStateStub(),
            browserSession: sinon.createStubInstance(CaptureSession),
            page: {},
            emit: sinon.spy()
        });

        return new UpdateStateProcessor({}).exec(opts.state, opts.browserSession, opts.page, opts.emit);
    };

    beforeEach(() => sandbox.stub(StateProcessor.prototype, 'exec'));

    afterEach(() => sandbox.restore());

    describe('exec', () => {
        it('should call base class "exec" method with correct args', () => {
            const state = util.makeStateStub();
            const page = {};
            const browserSession = sinon.createStubInstance(CaptureSession);

            StateProcessor.prototype.exec.returns(Promise.resolve({}));

            return exec_({state, browserSession, page})
                .then(() => {
                    assert.calledWithExactly(StateProcessor.prototype.exec, state, browserSession, page);
                });
        });

        it('should emit "UPDATE_RESULT" event', () => {
            const result = {updated: true};
            const emit = sandbox.stub();

            StateProcessor.prototype.exec.returns(Promise.resolve(result));

            return exec_({emit})
                .then(() => assert.calledWithExactly(emit, 'updateResult', result));
        });
    });
});
