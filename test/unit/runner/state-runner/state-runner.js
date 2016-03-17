'use strict';
var q = require('q'),
    StateRunner = require('../../../../lib/runner/state-runner/state-runner'),
    CaptureSession = require('../../../../lib/capture-session'),
    StateError = require('../../../../lib/errors/state-error'),
    Config = require('../../../../lib/config'),
    util = require('../../../util');

describe('runner/StateRunner', function() {
    function mkBrowserSessionStub_(opts) {
        opts = opts || {};
        var session = sinon.createStubInstance(CaptureSession);
        session.browser = util.browserWithId(opts.browserId || 'default-browser-id');
        session.browser.sessionId = opts.sessionId || 'default-session-id';

        session.runHook.returns(q.resolve());
        session.capture.returns(q.resolve());
        session.handleError.returns(q.resolve());

        return session;
    }

    function mkRunner_(state, browserSession) {
        state = state || util.makeStateStub();
        browserSession = browserSession || mkBrowserSessionStub_();
        var config = sinon.createStubInstance(Config);

        return new StateRunner(state, browserSession, config);
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

            return runner.run()
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

            return runner.run()
                .then(function() {
                    assert.calledWith(onEndState, {
                        suite: state.suite,
                        state: state,
                        browserId: 'browser',
                        sessionId: 'session'
                    });
                });
        });

        it('should perform state callback', function() {
            var browserSession = mkBrowserSessionStub_(),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession);

            return runner.run()
                .then(function() {
                    assert.calledOnce(browserSession.runHook);
                    assert.calledWith(browserSession.runHook, state.callback);
                });
        });

        it('should perform state callback before capture', function() {
            var browserSession = mkBrowserSessionStub_(),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession),
                mediator = sinon.spy().named('mediator');

            browserSession.runHook.returns(q.delay(1).then(mediator));

            return runner.run()
                .then(function() {
                    assert.callOrder(
                        browserSession.runHook,
                        mediator,
                        browserSession.capture
                    );
                });
        });

        it('should extend state errors with metadata', function() {
            var onStateError = sinon.spy().named('onError'),
                browserSession = mkBrowserSessionStub_(),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession);

            runner.on('err', onStateError);

            browserSession.capture.returns(q.reject(new StateError()));

            return runner.run()
                .then(function() {
                    var error = onStateError.firstCall.args[0];
                    assert.equal(error.state, state);
                    assert.equal(error.suite, state.suite);
                });
        });

        it('should handle error in state callback', function() {
            var browserSession = mkBrowserSessionStub_(),
                state = util.makeStateStub(),
                runner = mkRunner_(state, browserSession);

            var error = new StateError('some error');
            browserSession.runHook.returns(q.reject(error));

            return runner.run()
                .then(function() {
                    assert.calledOnce(browserSession.handleError);
                    assert.calledWith(browserSession.handleError, error);
                });
        });

        it('should emit events in correct order', function() {
            var onBeginState = sinon.spy().named('onBeginState'),
                onEndState = sinon.spy().named('onEndState'),
                runner = mkRunner_();

            runner.on('beginState', onBeginState);
            runner.on('endState', onEndState);

            return runner.run()
                .then(function() {
                    assert.callOrder(
                        onBeginState,
                        onEndState
                    );
                });
        });
    });
});
