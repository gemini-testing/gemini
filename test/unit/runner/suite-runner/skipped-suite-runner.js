'use strict';

const BrowserAgent = require('gemini-core').BrowserAgent;
const SkippedSuiteRunner = require('lib/runner/suite-runner/skipped-suite-runner');
const util = require('../../../util');

describe('runner/suite-runner/skipped-suite-runner', () => {
    const sandbox = sinon.sandbox.create();

    let runner;

    const mkRunner_ = (suite, browserId) => {
        suite = suite || util.makeSuiteStub();

        const browserAgent = new BrowserAgent();
        browserAgent.browserId = browserId || 'default-browser';

        return new SkippedSuiteRunner(suite, browserAgent);
    };

    beforeEach(() => {
        sandbox.stub(BrowserAgent.prototype, 'getBrowser');
        sandbox.stub(BrowserAgent.prototype, 'freeBrowser');
        runner = mkRunner_();
    });

    afterEach(() => sandbox.restore());

    it('should emit `beginSuite` event', () => {
        const onBeginSuite = sinon.spy().named('onBeginSuite');

        runner.on('beginSuite', onBeginSuite);

        return runner.run()
            .then(() => assert.calledOnce(onBeginSuite));
    });

    it('should emit `endSuite` event', () => {
        const onEndSuite = sinon.spy().named('onEndSuite');

        runner.on('endSuite', onEndSuite);

        return runner.run()
            .then(() => assert.calledOnce(onEndSuite));
    });

    it('should not get/free browser on run', () => {
        return runner.run()
            .then(() => {
                assert.notCalled(BrowserAgent.prototype.getBrowser);
                assert.notCalled(BrowserAgent.prototype.freeBrowser);
            });
    });

    it('should emit `skipState` for suite state', () => {
        const state = util.makeStateStub();
        const suite = util.makeSuiteStub({states: [state]});
        const onSkipState = sinon.spy().named('onSkipState');
        const runner = mkRunner_(suite, 'some-browser');

        runner.on('skipState', onSkipState);

        return runner.run()
            .then(() => {
                assert.calledWith(onSkipState, {
                    suite: suite,
                    state: state,
                    browserId: 'some-browser'
                });
            });
    });

    it('should emit `skipState` for each suite state', () => {
        const suite = util.makeSuiteStub({
            states: [util.makeStateStub(), util.makeStateStub()]
        });
        const onSkipState = sinon.spy().named('onSkipState');
        const runner = mkRunner_(suite);

        runner.on('skipState', onSkipState);

        return runner.run()
            .then(() => assert.calledTwice(onSkipState));
    });
});
