'use strict';

const Promise = require('bluebird');
const Browser = require('lib/browser');
const BasicPool = require('lib/browser-pool/basic-pool');
const CancelledError = require('lib/errors/cancelled-error');
const browserWithId = require('test/util').browserWithId;

describe('BasicPool', () => {
    const sandbox = sinon.sandbox.create();

    const stubBrowser = (id) => {
        id = id || 'id';
        const browser = browserWithId(id);
        sandbox.stub(browser, 'launch', () => {
            browser.sessionId = Date.now();
            return Promise.resolve();
        });
        sandbox.stub(browser, 'quit').returns(Promise.resolve());
        sandbox.stub(browser, 'reset');

        Browser.create.withArgs({id}).returns(browser);

        return browser;
    };

    const stubConfig = () => ({forBrowser: (id) => ({id})});

    let pool;

    beforeEach(() => {
        pool = new BasicPool(stubConfig());

        sandbox.stub(Browser, 'create');
    });
    afterEach(() => sandbox.restore());

    const requestBrowser = (browser) => {
        browser = browser || stubBrowser();

        return pool.getBrowser(browser.id);
    };

    it('should create new browser when requested', () => {
        const browser = stubBrowser('foo');

        return requestBrowser(browser)
            .then(() => assert.calledWith(Browser.create, {id: 'foo'}));
    });

    it('should launch a browser', () => {
        const browser = stubBrowser();

        return requestBrowser(browser)
            .then(() => assert.calledOnce(browser.launch));
    });

    it('should launch a browser with calibrator', () => {
        pool = new BasicPool(stubConfig(), 'calibrator');

        const browser = stubBrowser();

        return requestBrowser(browser)
            .then(() => assert.calledWith(browser.launch, 'calibrator'));
    });

    it('should finalize browser if failed to create it', () => {
        const browser = stubBrowser();
        const freeBrowser = sinon.spy(pool, 'freeBrowser');
        const assertCalled = () => assert.called(freeBrowser);

        browser.reset.returns(Promise.reject());

        return requestBrowser(browser)
            .then(assertCalled, assertCalled);
    });

    it('should quit a browser when freed', () => {
        const browser = stubBrowser();

        return requestBrowser(browser)
            .then((browser) => pool.freeBrowser(browser))
            .then(() => assert.calledOnce(browser.quit));
    });

    describe('cancel', () => {
        it('should quit all browsers on cancel', () => {
            return Promise.all([requestBrowser(stubBrowser('id1')), requestBrowser(stubBrowser('id2'))])
                .spread((firstBrowser, secondBrowser) => {
                    pool.cancel();

                    assert.calledOnce(firstBrowser.quit);
                    assert.calledOnce(secondBrowser.quit);
                });
        });

        it('should quit all browser with the same id on cancel', () => {
            return Promise.all([requestBrowser(stubBrowser('id')), requestBrowser(stubBrowser('id'))])
                .spread((firstBrowser, secondBrowser) => {
                    pool.cancel();

                    assert.calledOnce(firstBrowser.quit);
                    assert.calledOnce(secondBrowser.quit);
                });
        });

        it('should be rejected if getting of a browser was called after cancel', () => {
            pool.cancel();

            return assert.isRejected(requestBrowser(stubBrowser()), CancelledError);
        });

        it('should quit a browser once if it was launched after cancel', () => {
            const browser = stubBrowser();

            pool.cancel();

            return requestBrowser(browser)
                .catch(() => assert.calledOnce(browser.quit));
        });

        it('should clean active sessions after cancel', () => {
            const browser = stubBrowser();

            return requestBrowser(browser)
                .then(() => pool.cancel())
                .then(() => pool.cancel())
                .then(() => assert.calledOnce(browser.quit));
        });
    });
});
