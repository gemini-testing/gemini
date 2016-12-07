'use strict';
var Promise = require('bluebird'),
    DisabledStateRunner = require('lib/runner/state-runner/disabled-state-runner'),
    CaptureSession = require('lib/capture-session'),
    util = require('../../../util');

describe('runner/state-runner/disabled-state-runner', function() {
    function mkBrowserSessionStub_(opts) {
        opts = opts || {};
        var session = sinon.createStubInstance(CaptureSession);
        session.browser = util.browserWithId(opts.browserId || 'default-browser-id');
        session.browser.sessionId = opts.sessionId || 'default-session-id';

        session.runActions.returns(Promise.resolve());
        session.capture.returns(Promise.resolve());

        return session;
    }

    function mkRunner_(state, browserSession) {
        state = state || util.makeStateStub();
        browserSession = browserSession || mkBrowserSessionStub_();

        return new DisabledStateRunner(state, browserSession);
    }

    it('should perform state actions', function() {
        var browserSession = mkBrowserSessionStub_(),
            state = util.makeStateStub(),
            runner = mkRunner_(state, browserSession);

        return runner.run()
            .then(function() {
                assert.calledOnce(browserSession.runActions);
                assert.calledWith(browserSession.runActions, state.actions);
            });
    });

    it('should not perform capture', function() {
        var browserSession = mkBrowserSessionStub_(),
            state = util.makeStateStub(),
            runner = mkRunner_(state, browserSession);

        return runner.run()
            .then(function() {
                assert.notCalled(browserSession.capture);
            });
    });
});
