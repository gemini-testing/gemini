'use strict';

const BrowserAgent = require('lib/runner/browser-runner/browser-agent');
const StatelessSuiteRunner = require('lib/runner/suite-runner/stateless-suite-runner');
const util = require('../../../util');

describe('runner/suite-runner/stateless-suite-runner', () => {
    const sandbox = sinon.sandbox.create();
    const suite = util.makeSuiteStub();
    const browserAgent = new BrowserAgent('default-browser');
    const runner = new StatelessSuiteRunner(suite, browserAgent);

    beforeEach(() => {
        sandbox.stub(BrowserAgent.prototype, 'getBrowser');
        sandbox.stub(BrowserAgent.prototype, 'freeBrowser');
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
});
