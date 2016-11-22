'use strict';

const Promise = require('bluebird');
const QEmitter = require('qemitter');
const bluebirdQ = require('bluebird-q');
const Browser = require('lib/browser');
const BasicPool = require('lib/browser-pool/basic-pool');
const CancelledError = require('lib/errors/cancelled-error');
const browserWithId = require('test/util').browserWithId;
const Events = require('lib/constants/events');
const _ = require('lodash');

describe('BasicPool', () => {
    const sandbox = sinon.sandbox.create();

    const stubBrowser_ = (id) => {
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

    const mkPool_ = (opts) => {
        opts = _.defaults(opts || {}, {
            config: stubConfig(),
            calibrator: 'default-calibrator',
            emitter: new QEmitter()
        });

        return new BasicPool(opts.config, opts.calibrator, opts.emitter);
    };

    const requestBrowser_ = (browser, pool) => {
        browser = browser || stubBrowser_();
        pool = pool || mkPool_();

        return pool.getBrowser(browser.id);
    };

    beforeEach(() => {
        sandbox.stub(Browser, 'create');
    });

    afterEach(() => sandbox.restore());

    it('should create new browser when requested', () => {
        const browser = stubBrowser_('foo');

        return requestBrowser_(browser)
            .then(() => assert.calledWith(Browser.create, {id: 'foo'}));
    });

    it('should launch a browser', () => {
        const browser = stubBrowser_();

        return requestBrowser_(browser)
            .then(() => assert.calledOnce(browser.launch));
    });

    it('should launch a browser with calibrator', () => {
        const pool = mkPool_({calibrator: 'calibrator'});

        const browser = stubBrowser_();

        return requestBrowser_(browser, pool)
            .then(() => assert.calledWith(browser.launch, 'calibrator'));
    });

    it('should finalize browser if failed to create it', () => {
        const browser = stubBrowser_();
        const pool = mkPool_();
        const freeBrowser = sinon.spy(pool, 'freeBrowser');
        const assertCalled = () => assert.called(freeBrowser);

        browser.reset.returns(bluebirdQ.reject());

        return requestBrowser_(browser, pool)
            .then(assertCalled, assertCalled);
    });

    describe('START_BROWSER event', () => {
        it('should be emitted on browser start', () => {
            const emitter = new QEmitter();
            const onSessionStart = sinon.spy().named('onSessionStart');
            emitter.on(Events.START_BROWSER, onSessionStart);

            const pool = mkPool_({emitter});
            const browser = stubBrowser_();

            return requestBrowser_(browser, pool)
                .then(() => {
                    assert.calledOnce(onSessionStart);
                    assert.calledWith(onSessionStart, browser);
                });
        });

        it('handler should be waited by pool', () => {
            const emitter = new QEmitter();
            const afterSessionStart = sinon.spy().named('afterSessionStart');
            emitter.on(Events.START_BROWSER, () => bluebirdQ.delay(100).then(afterSessionStart));

            const pool = mkPool_({emitter});
            const browser = stubBrowser_();

            return requestBrowser_(browser, pool)
                .then(() => assert.callOrder(afterSessionStart, browser.reset));
        });

        it('handler fail should fail browser request', () => {
            const emitter = new QEmitter();
            emitter.on(Events.START_BROWSER, () => bluebirdQ.reject('some-error'));

            const pool = mkPool_({emitter});
            const browser = stubBrowser_();

            return assert.isRejected(requestBrowser_(browser, pool), 'some-error');
        });
    });

    it('should quit a browser when freed', () => {
        const pool = mkPool_();
        const browser = stubBrowser_();

        return requestBrowser_(browser, pool)
            .then((browser) => pool.freeBrowser(browser))
            .then(() => assert.calledOnce(browser.quit));
    });

    describe('STOP_BROWSER event', () => {
        it('should be emitted on browser quit', () => {
            const emitter = new QEmitter();
            const onSessionEnd = sinon.spy().named('onSessionEnd');
            emitter.on(Events.STOP_BROWSER, onSessionEnd);

            const pool = mkPool_({emitter});
            const browser = stubBrowser_();

            return requestBrowser_(browser, pool)
                .then((browser) => pool.freeBrowser(browser))
                .then(() => {
                    assert.calledOnce(onSessionEnd);
                    assert.calledWith(onSessionEnd, browser);
                });
        });

        it('handler should be waited before actual quit', () => {
            const emitter = new QEmitter();
            const afterSessionEnd = sinon.spy().named('afterSessionEnd');
            emitter.on(Events.STOP_BROWSER, () => bluebirdQ.delay(100).then(afterSessionEnd));

            const pool = mkPool_({emitter});
            const browser = stubBrowser_();

            return requestBrowser_(browser, pool)
                .then((browser) => pool.freeBrowser(browser))
                .then(() => assert.callOrder(afterSessionEnd, browser.quit));
        });

        it('handler fail should not prevent browser from quit', () => {
            const emitter = new QEmitter();
            emitter.on(Events.STOP_BROWSER, () => bluebirdQ.reject());

            const pool = mkPool_({emitter});
            const browser = stubBrowser_();

            return requestBrowser_(browser, pool)
                .then((browser) => pool.freeBrowser(browser))
                .then(() => assert.calledOnce(browser.quit));
        });
    });

    describe('cancel', () => {
        it('should quit all browsers on cancel', () => {
            const pool = mkPool_();

            return Promise
                .all([
                    requestBrowser_(stubBrowser_('id1'), pool),
                    requestBrowser_(stubBrowser_('id2'), pool)
                ])
                .spread((firstBrowser, secondBrowser) => {
                    pool.cancel();

                    assert.calledOnce(firstBrowser.quit);
                    assert.calledOnce(secondBrowser.quit);
                });
        });

        it('should quit all browser with the same id on cancel', () => {
            const pool = mkPool_();

            return Promise
                .all([
                    requestBrowser_(stubBrowser_('id'), pool),
                    requestBrowser_(stubBrowser_('id'), pool)
                ])
                .spread((firstBrowser, secondBrowser) => {
                    pool.cancel();

                    assert.calledOnce(firstBrowser.quit);
                    assert.calledOnce(secondBrowser.quit);
                });
        });

        it('should be rejected if getting of a browser was called after cancel', () => {
            const pool = mkPool_();

            pool.cancel();

            return assert.isRejected(requestBrowser_(stubBrowser_(), pool), CancelledError);
        });

        it('should quit a browser once if it was launched after cancel', () => {
            const pool = mkPool_();
            const browser = stubBrowser_();

            pool.cancel();

            return requestBrowser_(browser, pool)
                .catch(() => assert.calledOnce(browser.quit));
        });

        it('should clean active sessions after cancel', () => {
            const pool = mkPool_();
            const browser = stubBrowser_();

            return requestBrowser_(browser, pool)
                .then(() => pool.cancel())
                .then(() => pool.cancel())
                .then(() => assert.calledOnce(browser.quit));
        });
    });
});
