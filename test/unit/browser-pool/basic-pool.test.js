'use strict';

const q = require('q');
const Browser = require('lib/browser');
const BasicPool = require('lib/browser-pool/basic-pool');
const signalHandler = require('lib/signal-handler');
const browserWithId = require('test/util').browserWithId;

describe('UnlimitedPool', function() {
    const sandbox = sinon.sandbox.create();
    const browserConfig = {id: 'id'};

    let config;
    let browser;
    let pool;
    let requestBrowser;

    beforeEach(() => {
        config = {
            forBrowser: sinon.stub().returns(browserConfig)
        };
        browser = sandbox.stub(browserWithId('id'));
        browser.launch.returns(q());
        browser.quit.returns(q());

        sandbox.stub(Browser, 'create').returns(browser);
        pool = new BasicPool(config);
        requestBrowser = () => pool.getBrowser('id');
    });

    afterEach(() => sandbox.restore());

    it('should create new browser when requested', () => {
        return requestBrowser()
            .then(() => assert.calledWith(Browser.create, browserConfig));
    });

    it('should launch a browser', () => {
        return requestBrowser()
            .then(() => assert.calledOnce(browser.launch));
    });

    it('should finalize browser if failed to create it', () => {
        const freeBrowser = sinon.spy(pool, 'freeBrowser');
        const assertCalled = () => assert.called(freeBrowser);

        browser.reset.returns(q.reject());

        return requestBrowser()
            .then(assertCalled, assertCalled);
    });

    it('should quit a browser when freed', () => {
        return requestBrowser()
            .then((browser) => pool.freeBrowser(browser))
            .then(() => assert.calledOnce(browser.quit));
    });

    it('should quit a browser on exit signal', () => {
        return requestBrowser()
            .then(() => signalHandler.emit('exit'))
            .then(() => assert.calledOnce(browser.quit));
    });
});
