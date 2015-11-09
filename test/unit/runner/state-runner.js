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

        it('should not emit `beginState` if state is skipped', function() {
            var onBeginState = sinon.spy().named('onBeginState'),
                runner = mkRunner_(),
                state = util.makeStateStub();

            runner.on('beginState', onBeginState);
            state.shouldSkip.returns(true);

            return runner.run(state)
                .then(function() {
                    assert.notCalled(onBeginState);
                });
        });

        it('should emit `skipState` if state is skipped', function() {
            var onSkipState = sinon.spy().named('onSkipState'),
                browserSession = mkBrowserSessionStub_({
                    browserId: 'browser',
                    sessionId: 'session'
                }),
                runner = mkRunner_(browserSession),
                state = util.makeStateStub();

            runner.on('skipState', onSkipState);
            state.shouldSkip.returns(true);

            return runner.run(state)
                .then(function() {
                    assert.calledWith(onSkipState, {
                        suite: state.suite,
                        state: state,
                        browserId: 'browser',
                        sessionId: 'session'
                    });
                });
        });

        it('should not emit `skipState` if state is not skipped', function() {
            var onSkipState = sinon.spy().named('onSkipState'),
                runner = mkRunner_(),
                state = util.makeStateStub();

            runner.on('skipState', onSkipState);

            return runner.run(state)
                .then(function() {
                    assert.notCalled(onSkipState);
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

        it('should not emit `endState` if state is skipped', function() {
            var onEndState = sinon.spy().named('onEndState'),
                runner = mkRunner_(),
                state = util.makeStateStub();

            runner.on('endState', onEndState);
            state.shouldSkip.returns(true);

            return runner.run(state)
                .then(function() {
                    assert.notCalled(onEndState);
                });
        });

        it('should extend state errors with metadata', function() {
            var onStateError = sinon.spy().named('onError'),
                browserSession = mkBrowserSessionStub_(),
                runner = mkRunner_(browserSession),
                state = util.makeStateStub();

            runner.on('error', onStateError);

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
