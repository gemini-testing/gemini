'use strict';
const Promise = require('bluebird');
const DisabledStateRunner = require('lib/runner/state-runner/disabled-state-runner');
const CaptureSession = require('lib/capture-session');
const util = require('../../../util');

describe('runner/state-runner/disabled-state-runner', () => {
    function mkBrowserSessionStub_(opts) {
        opts = opts || {};
        const session = sinon.createStubInstance(CaptureSession);
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

    it('should perform state actions', () => {
        const browserSession = mkBrowserSessionStub_();
        const state = util.makeStateStub();
        const runner = mkRunner_(state, browserSession);

        return runner.run()
            .then(() => {
                assert.calledOnce(browserSession.runActions);
                assert.calledWith(browserSession.runActions, state.actions);
            });
    });

    it('should not perform capture', () => {
        const browserSession = mkBrowserSessionStub_();
        const state = util.makeStateStub();
        const runner = mkRunner_(state, browserSession);

        return runner.run()
            .then(() => assert.notCalled(browserSession.capture));
    });
});
