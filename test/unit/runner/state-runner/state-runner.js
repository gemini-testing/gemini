'use strict';
const Promise = require('bluebird');
const StateRunner = require('lib/runner/state-runner/state-runner');
const CaptureSession = require('lib/capture-session');
const StateError = require('lib/errors/state-error');
const StateProcessor = require('lib/state-processor/state-processor');
const util = require('../../../util');

describe('runner/state-runner/state-runner', () => {
    function mkBrowserSessionStub_(opts) {
        opts = opts || {};
        const session = sinon.createStubInstance(CaptureSession);
        session.browser = util.browserWithId(opts.browserId || 'default-browser-id');
        session.browser.sessionId = opts.sessionId || 'default-session-id';

        session.runActions.returns(Promise.resolve());
        session.capture.returns(Promise.resolve({}));
        session.extendWithPageScreenshot.returns(Promise.resolve());

        return session;
    }

    function mkRunner_(state, browserSession) {
        state = state || util.makeStateStub();
        browserSession = browserSession || mkBrowserSessionStub_();

        return new StateRunner(state, browserSession);
    }

    function mkStateProcessor_() {
        const stateProcessor = sinon.createStubInstance(StateProcessor);
        stateProcessor.exec.returns(Promise.resolve());
        return stateProcessor;
    }

    function run_(runner, stateProcessor) {
        stateProcessor = stateProcessor || mkStateProcessor_();
        return runner.run(stateProcessor);
    }

    describe('run', () => {
        it('should emit `beginState` event', () => {
            const onBeginState = sinon.spy().named('onBeginState');
            const browserSession = mkBrowserSessionStub_({
                browserId: 'browser',
                sessionId: 'session'
            });
            const state = util.makeStateStub();
            const runner = mkRunner_(state, browserSession);

            runner.on('beginState', onBeginState);

            return run_(runner)
                .then(() => {
                    assert.calledWith(onBeginState, {
                        suite: state.suite,
                        state: state,
                        browserId: 'browser',
                        sessionId: 'session'
                    });
                });
        });

        it('should emit `endState` event', () => {
            const onEndState = sinon.spy().named('onEndState');
            const browserSession = mkBrowserSessionStub_({
                browserId: 'browser',
                sessionId: 'session'
            });
            const state = util.makeStateStub();
            const runner = mkRunner_(state, browserSession);

            runner.on('endState', onEndState);

            return run_(runner)
                .then(() => {
                    assert.calledWith(onEndState, {
                        suite: state.suite,
                        state: state,
                        browserId: 'browser',
                        sessionId: 'session'
                    });
                });
        });

        it('should perform state actions', () => {
            const browserSession = mkBrowserSessionStub_();
            const state = util.makeStateStub();
            const runner = mkRunner_(state, browserSession);

            return run_(runner)
                .then(() => {
                    assert.calledOnce(browserSession.runActions);
                    assert.calledWith(browserSession.runActions, state.actions);
                });
        });

        it('should perform state actions before processing state', () => {
            const browserSession = mkBrowserSessionStub_();
            const state = util.makeStateStub();
            const runner = mkRunner_(state, browserSession);
            const mediator = sinon.spy().named('mediator');
            const stateProcessor = mkStateProcessor_();

            browserSession.runActions.returns(Promise.delay(50).then(mediator));

            return run_(runner, stateProcessor)
                .then(() => {
                    assert.callOrder(
                        browserSession.runActions,
                        mediator,
                        stateProcessor.exec
                    );
                });
        });

        it('should extend error in state actions with page screenshot', () => {
            const browserSession = mkBrowserSessionStub_();
            const state = util.makeStateStub();
            const runner = mkRunner_(state, browserSession);

            const error = new StateError('some error');
            browserSession.runActions.returns(Promise.reject(error));

            return run_(runner)
                .then(() => {
                    assert.calledOnce(browserSession.extendWithPageScreenshot);
                    assert.calledWith(browserSession.extendWithPageScreenshot, error);
                });
        });

        it('should prepare screenshot before processing state', () => {
            const browserSession = mkBrowserSessionStub_();
            const state = util.makeStateStub();
            const runner = mkRunner_(state, browserSession);
            const mediator = sinon.spy().named('mediator');
            const stateProcessor = mkStateProcessor_();

            browserSession.prepareScreenshot.returns(Promise.delay(500).then(mediator));

            return run_(runner, stateProcessor)
                .then(() => {
                    assert.callOrder(
                        browserSession.prepareScreenshot,
                        mediator,
                        stateProcessor.exec
                    );
                });
        });

        it('should extend prepare screenshot error with page screenshot', () => {
            const browserSession = mkBrowserSessionStub_();
            const state = util.makeStateStub();
            const runner = mkRunner_(state, browserSession);

            const error = new StateError('some error');
            browserSession.prepareScreenshot.returns(Promise.reject(error));

            return run_(runner)
                .then(() => {
                    assert.calledOnce(browserSession.extendWithPageScreenshot);
                    assert.calledWith(browserSession.extendWithPageScreenshot, error);
                });
        });

        it('should process state', () => {
            const browserSession = mkBrowserSessionStub_();
            const state = util.makeStateStub();
            const runner = mkRunner_(state, browserSession);
            const stateProcessor = mkStateProcessor_();

            stateProcessor.exec.returns(Promise.resolve());

            return runner.run(stateProcessor)
                .then(() => {
                    assert.calledOnce(stateProcessor.exec);
                    assert.calledWith(stateProcessor.exec, state, browserSession);
                });
        });

        it('should extend state errors with metadata', () => {
            const onStateError = sinon.spy().named('onError');
            const state = util.makeStateStub();
            const runner = mkRunner_(state);
            const stateProcessor = mkStateProcessor_();

            runner.on('err', onStateError);

            stateProcessor.exec.returns(Promise.reject(new StateError()));

            return run_(runner, stateProcessor)
                .then(() => {
                    const error = onStateError.firstCall.args[0];
                    assert.equal(error.state, state);
                    assert.equal(error.suite, state.suite);
                });
        });

        it('should emit events in correct order', () => {
            const onBeginState = sinon.spy().named('onBeginState');
            const onEndState = sinon.spy().named('onEndState');
            const runner = mkRunner_();

            runner.on('beginState', onBeginState);
            runner.on('endState', onEndState);

            return run_(runner)
                .then(() => assert.callOrder(onBeginState, onEndState));
        });
    });
});
