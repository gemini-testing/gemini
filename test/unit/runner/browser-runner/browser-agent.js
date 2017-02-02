'use strict';

const Promise = require('bluebird');
const BrowserAgent = require('lib/runner/browser-runner/browser-agent');
const BasicPool = require('lib/browser-pool/basic-pool');

describe('runner/browser-runner/browser-agent', () => {
    const sandbox = sinon.sandbox.create();
    let browserPool;

    beforeEach(() => {
        browserPool = sinon.createStubInstance(BasicPool);
        browserPool.freeBrowser.returns(Promise.resolve());
        browserPool.getBrowser.returns(Promise.resolve({}));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should return browser associated with agent', () => {
        const browserAgent = BrowserAgent.create('browser', browserPool);

        browserAgent.getBrowser();

        assert.calledWith(browserPool.getBrowser, 'browser');
    });

    it('should rerequest browser if got same session', () => {
        const someBro = {sessionId: 'some-id'};
        const otherBro = {sessionId: 'other-id'};

        browserPool.getBrowser.returns(Promise.resolve(someBro));

        const browserAgent = BrowserAgent.create('bro', browserPool);

        return browserAgent.getBrowser()
            .then((bro) => browserAgent.freeBrowser(bro))
            .then(() => {
                // reset stubs
                browserPool.getBrowser = sandbox.stub();
                browserPool.getBrowser.onFirstCall().returns(Promise.resolve(someBro));
                browserPool.getBrowser.onSecondCall().returns(Promise.resolve(otherBro));

                browserPool.freeBrowser = sandbox.stub().returns(Promise.resolve());
            })
            .then(() => browserAgent.getBrowser())
            .then((bro) => {
                assert.equal(bro, otherBro);
                assert.calledTwice(browserPool.getBrowser);
                assert.calledWith(browserPool.freeBrowser, someBro, {force: true});
            });
    });

    it('should free passed browser', () => {
        const browserAgent = BrowserAgent.create(undefined, browserPool);
        const browser = sinon.spy().named('browser');

        browserAgent.freeBrowser(browser);

        assert.calledWith(browserPool.freeBrowser, browser);
    });
});
