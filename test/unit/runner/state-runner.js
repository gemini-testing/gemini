'use strict';
var q = require('q'),
    StateRunner = require('../../../lib/runner/state-runner'),
    CaptureSession = require('../../../lib/capture-session'),
    StateError = require('../../../lib/errors/state-error'),
    Config = require('../../../lib/config'),
    util = require('../../util');

describe('runner/StateRunner', function() {
    function mkBrowserSessionStub_(opts) {
        opts = opts || {};
        var session = sinon.createStubInstance(CaptureSession);
        session.browser = util.browserWithId(opts.browserId || 'default-browser-id');
        session.browser.sessionId = opts.sessionId || 'default-session-id';

        session.runHook.returns(q.resolve());
        session.capture.returns(q.resolve());

        return session;
    }

    function mkRunner_(browserSession) {
        browserSession = browserSession || mkBrowserSessionStub_();
        var config = sinon.createStubInstance(Config);

        return StateRunner.create(browserSession, config);
    }

    describe('run', function() {
        it('should emit `beginState` event', function() {
            var onBeginState = sinon.spy().named('onBeginState'),
                browserSession = mkBrowserSessionStub_({
                    browserId: 'browser',
                    sessionId: 'session'
                }),
                runner = mkRunner_(browserSession),
                state = util.makeStateStub();

            runner.on('beginState', onBeginState);

            return runner.run(state)
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
                runner = mkRunner_(browserSession),
                state = util.makeStateStub();

            runner.on('endState', onEndState);

            return runner.run(state)
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
                runner = mkRunner_(browserSession),
                suite = util.makeSuiteStub(),
                state = util.makeStateStub(suite);

            return runner.run(state)
                .then(function() {
                    assert.calledOnce(browserSession.runHook);
                    assert.calledWith(browserSession.runHook,
                        state.callback,
                        suite
                    );
                });
        });

        it('should perform state callback before capture', function() {
            var browserSession = mkBrowserSessionStub_(),
                runner = mkRunner_(browserSession),
                state = util.makeStateStub(),
                mediator = sinon.spy().named('mediator');

            browserSession.runHook.returns(q.delay(1).then(mediator));

            return runner.run(state)
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
                runner = mkRunner_(browserSession),
                state = util.makeStateStub();

            runner.on('err', onStateError);

            browserSession.capture.returns(q.reject(new StateError()));

            return runner.run(state)
                .then(function() {
                    assert.calledWithMatch(onStateError, {
                        state: state,
                        suite: state.suite
                    });
                });
        });

        it('should emit events in correct order', function() {
            var onBeginState = sinon.spy().named('onBeginState'),
                onEndState = sinon.spy().named('onEndState'),
                runner = mkRunner_(),
                state = util.makeStateStub();

            runner.on('beginState', onBeginState);
            runner.on('endState', onEndState);

            return runner.run(state)
                .then(function() {
                    assert.callOrder(
                        onBeginState,
                        onEndState
                    );
                });
        });
    });
});
