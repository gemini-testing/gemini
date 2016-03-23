'use strict';

var BrowserAgent = require('../../../../src/runner/browser-runner/browser-agent'),
    SkippedSuiteRunner = require('../../../../src/runner/suite-runner/skipped-suite-runner'),
    util = require('../../../util');

describe('runner/suite-runner/skipped-suite-runner', function() {
    var sandbox = sinon.sandbox.create(),
        runner;

    function mkRunner_(suite, browserId) {
        suite = suite || util.makeSuiteStub();

        var browserAgent = new BrowserAgent();
        browserAgent.browserId = browserId || 'default-browser';

        return new SkippedSuiteRunner(suite, browserAgent);
    }

    beforeEach(function() {
        sandbox.stub(BrowserAgent.prototype);
        runner = mkRunner_();
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should emit `beginSuite` event', function() {
        var onBeginSuite = sinon.spy().named('onBeginSuite');

        runner.on('beginSuite', onBeginSuite);

        return runner.run()
            .then(function() {
                assert.calledOnce(onBeginSuite);
            });
    });

    it('should emit `endSuite` event', function() {
        var onEndSuite = sinon.spy().named('onEndSuite');

        runner.on('endSuite', onEndSuite);

        return runner.run()
            .then(function() {
                assert.calledOnce(onEndSuite);
            });
    });

    it('should not get/free browser on run', function() {
        return runner.run()
            .then(function() {
                assert.notCalled(BrowserAgent.prototype.getBrowser);
                assert.notCalled(BrowserAgent.prototype.freeBrowser);
            });
    });

    it('should emit `skipState` for suite state', function() {
        var state = util.makeStateStub(),
            suite = util.makeSuiteStub({
                states: [state]
            }),
            onSkipState = sinon.spy().named('onSkipState'),
            runner = mkRunner_(suite, 'some-browser');

        runner.on('skipState', onSkipState);

        return runner.run()
            .then(function() {
                assert.calledWith(onSkipState, {
                    suite: suite,
                    state: state,
                    browserId: 'some-browser'
                });
            });
    });

    it('should emit `skipState` for each suite state', function() {
        var suite = util.makeSuiteStub({
                states: [util.makeStateStub(), util.makeStateStub()]
            }),
            onSkipState = sinon.spy().named('onSkipState'),
            runner = mkRunner_(suite);

        runner.on('skipState', onSkipState);

        return runner.run()
            .then(function() {
                assert.calledTwice(onSkipState);
            });
    });
});
