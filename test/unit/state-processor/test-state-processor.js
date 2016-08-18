'use strict';

const _ = require('lodash');
const q = require('q');

const CaptureSession = require('lib/capture-session');
const StateProcessor = require('lib/state-processor/state-processor');
const TestStateProcessor = require('lib/state-processor/test-state-processor');
const Image = require('lib/image');
const util = require('../../util');

describe('state-processor/test-state-processor', () => {
    const sandbox = sinon.sandbox.create();

    let BrowserSession;

    const mkTestStateProc_ = () => {
        const config = _.set({}, 'system.diffColor', '#ff00ff');
        return new TestStateProcessor(config);
    };

    const exec_ = (opts) => {
        opts = _.defaultsDeep(opts || {}, {
            state: util.makeStateStub(),
            page: {},
            emit: sinon.spy()
        });

        return mkTestStateProc_().exec(opts.state, BrowserSession, opts.page, opts.emit);
    };

    beforeEach(() => {
        sandbox.stub(StateProcessor.prototype, 'exec');
        BrowserSession = sinon.createStubInstance(CaptureSession);
        _.set(BrowserSession, 'browser.config', {});
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

        it('should emit END_TEST event with atached diff info when images aren\'t equal', () => {
            const result = {equal: false};
            const emit = sandbox.stub();

            StateProcessor.prototype.exec.returns(q(result));
            sandbox.stub(Image, 'buildDiff').returns({diff: 'default/path/diff.png'});

            return exec_({emit})
                .then(() => {
                    assert.calledWithExactly(emit, 'endTest', _.extend(result, {saveDiffTo: () => {}}));
                });
        });

        it('should emit END_TEST event with diff results when images equal', () => {
            const result = {equal: true};
            const emit = sandbox.stub();

            StateProcessor.prototype.exec.returns(q(result));

            return exec_({emit})
                .then(() => assert.calledWithExactly(emit, 'endTest', result));
        });
    });
});
