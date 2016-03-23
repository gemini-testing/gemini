'use strict';

var BrowserAgent = require('../../../../src/runner/browser-runner/browser-agent'),
    StatelessSuiteRunner = require('../../../../src/runner/suite-runner/stateless-suite-runner'),
    util = require('../../../util');

describe('runner/suite-runner/stateless-suite-runner', function() {
    var sandbox = sinon.sandbox.create(),
        suite = util.makeSuiteStub(),
        browserAgent = new BrowserAgent('default-browser'),
        runner = new StatelessSuiteRunner(suite, browserAgent);

    beforeEach(function() {
        sandbox.stub(BrowserAgent.prototype);
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
});
