'use strict';

const BrowserAgent = require('lib/runner/browser-runner/browser-agent');
const BasicPool = require('lib/browser-pool/basic-pool');

describe('runner/browser-runner/browser-agent', () => {
    const sandbox = sinon.sandbox.create();
    let browserPool;

    beforeEach(() => {
        browserPool = sinon.createStubInstance(BasicPool);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should return browser associated with agent', () => {
        const browserAgent = BrowserAgent.create('browser', browserPool);

        browserAgent.getBrowser();

        assert.calledWith(browserPool.getBrowser, 'browser');
    });

    it('should free passed browser', () => {
        const browserAgent = BrowserAgent.create(undefined, browserPool);
        const browser = sinon.spy().named('browser');

        browserAgent.freeBrowser(browser);

        assert.calledWith(browserPool.freeBrowser, browser);
    });
});
