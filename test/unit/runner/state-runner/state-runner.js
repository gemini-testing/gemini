'use strict';
var Promise = require('bluebird'),
    StateRunner = require('lib/runner/state-runner/state-runner'),
    CaptureSession = require('lib/capture-session'),
    StateError = require('lib/errors/state-error'),
    StateProcessor = require('lib/state-processor/state-processor'),
    Config = require('lib/config'),
    util = require('../../../util');

describe('runner/state-runner/state-runner', function() {
    function mkBrowserSessionStub_(opts) {
        opts = opts || {};
        var session = sinon.createStubInstance(CaptureSession);
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
        var config = sinon.createStubInstance(Config);

        return new StateRunner(state, browserSession, config);
    }

    function mkStateProcessor_() {
        var stateProcessor = sinon.createStubInstance(StateProcessor);
        stateProcessor.exec.returns(Promise.resolve());
        return stateProcessor;
    }

    function run_(runner, stateProcessor) {
        stateProcessor = stateProcessor || mkStateProcessor_();
        return runner.run(stateProcessor);
    }

    describe('run', function() {
        it('should emit `beginState` event', function() {
            var onBeginState = sinon.spy().named('onBeginState'),
                browserSession = mkBrowserSessionStub_({
                    browserId: 'browser',
                    sessionId: 'session'
                }),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession);

            runner.on('beginState', onBeginState);

            return run_(runner)
                .then(function() {
                    assert.calledWith(onBeginState, {
                        suite: state.suite,
                        state: state,
                        browserId: 'browser',
                        sessionId: 'session'
                    });
                });
        });

        it('should emit `endState` event', function() {
            var onEndState = sinon.spy().named('onEndState'),
                browserSession = mkBrowserSessionStub_({
                    browserId: 'browser',
                    sessionId: 'session'
                }),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession);

            runner.on('endState', onEndState);

            return run_(runner)
                .then(function() {
                    assert.calledWith(onEndState, {
                        suite: state.suite,
                        state: state,
                        browserId: 'browser',
                        sessionId: 'session'
                    });
                });
        });

        it('should perform state actions', function() {
            var browserSession = mkBrowserSessionStub_(),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession);

            return run_(runner)
                .then(function() {
                    assert.calledOnce(browserSession.runActions);
                    assert.calledWith(browserSession.runActions, state.actions);
                });
        });

        it('should perform state actions before processing state', function() {
            var browserSession = mkBrowserSessionStub_(),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession),
                mediator = sinon.spy().named('mediator'),
                stateProcessor = mkStateProcessor_();

            browserSession.runActions.returns(Promise.delay(50).then(mediator));

            return run_(runner, stateProcessor)
                .then(function() {
                    assert.callOrder(
                        browserSession.runActions,
                        mediator,
                        stateProcessor.exec
                    );
                });
        });

        it('should extend error in state actions with page screenshot', function() {
            var browserSession = mkBrowserSessionStub_(),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession);

            var error = new StateError('some error');
            browserSession.runActions.returns(Promise.reject(error));

            return run_(runner)
                .then(function() {
                    assert.calledOnce(browserSession.extendWithPageScreenshot);
                    assert.calledWith(browserSession.extendWithPageScreenshot, error);
                });
        });

        it('should prepare screenshot before processing state', function() {
            var browserSession = mkBrowserSessionStub_(),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession),
                mediator = sinon.spy().named('mediator'),
                stateProcessor = mkStateProcessor_();

            browserSession.prepareScreenshot.returns(Promise.delay(500).then(mediator));

            return run_(runner, stateProcessor)
                .then(function() {
                    assert.callOrder(
                        browserSession.prepareScreenshot,
                        mediator,
                        stateProcessor.exec
                    );
                });
        });

        it('should extend prepare screenshot error with page screenshot', function() {
            var browserSession = mkBrowserSessionStub_(),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession);

            var error = new StateError('some error');
            browserSession.prepareScreenshot.returns(Promise.reject(error));

            return run_(runner)
                .then(function() {
                    assert.calledOnce(browserSession.extendWithPageScreenshot);
                    assert.calledWith(browserSession.extendWithPageScreenshot, error);
                });
        });

        it('should process state', function() {
            var browserSession = mkBrowserSessionStub_(),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession),
                stateProcessor = mkStateProcessor_();

            stateProcessor.exec.returns(Promise.resolve());

            return runner.run(stateProcessor)
                .then(function() {
                    assert.calledOnce(stateProcessor.exec);
                    assert.calledWith(stateProcessor.exec, state, browserSession);
                });
        });

        it('should extend state errors with metadata', function() {
            var onStateError = sinon.spy().named('onError'),
                state = util.makeStateStub(),
                runner = mkRunner_(state),
                stateProcessor = mkStateProcessor_();

            runner.on('err', onStateError);

            stateProcessor.exec.returns(Promise.reject(new StateError()));

            return run_(runner, stateProcessor)
                .then(function() {
                    var error = onStateError.firstCall.args[0];
                    assert.equal(error.state, state);
                    assert.equal(error.suite, state.suite);
                });
        });

        it('should emit events in correct order', function() {
            var onBeginState = sinon.spy().named('onBeginState'),
                onEndState = sinon.spy().named('onEndState'),
                runner = mkRunner_();

            runner.on('beginState', onBeginState);
            runner.on('endState', onEndState);

            return run_(runner)
                .then(function() {
                    assert.callOrder(
                        onBeginState,
                        onEndState
                    );
                });
        });
    });
});
