'use strict';

const _ = require('lodash');
const PerBrowserLimitedPool = require('lib/browser-pool/per-browser-limited-pool');
const LimitedPool = require('lib/browser-pool/limited-pool');
const BasicPool = require('lib/browser-pool/basic-pool');
const browserWithId = require('../../util').browserWithId;

describe('PerBrowserLimitedPool', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(LimitedPool, 'create').returns(sinon.createStubInstance(LimitedPool));
    });

    afterEach(() => sandbox.restore());

    const mkConfigStub_ = (browsers) => {
        return {
            getBrowserIds: () => _.keys(browsers),
            forBrowser: (id) => browsers[id]
        };
    };

    describe('constructor', () => {
        it('should create LimitedPool for each browser', () => {
            const config = mkConfigStub_({
                bro1: {sessionsPerBrowser: 1},
                bro2: {sessionsPerBrowser: 2}
            });
            const underlyingPool = sinon.createStubInstance(BasicPool);

            new PerBrowserLimitedPool(config, underlyingPool); // eslint-disable-line no-new

            assert.calledTwice(LimitedPool.create);
            assert.calledWith(LimitedPool.create, 1, underlyingPool);
            assert.calledWith(LimitedPool.create, 2, underlyingPool);
        });
    });

    describe('getBrowser', () => {
        it('should redirect request to corresponding pool', () => {
            const config = mkConfigStub_({
                bro1: {sessionsPerBrowser: 1},
                bro2: {sessionsPerBrowser: 2}
            });

            const bro1Pool = sinon.createStubInstance(BasicPool);
            const bro2Pool = sinon.createStubInstance(BasicPool);

            LimitedPool.create.withArgs(1).returns(bro1Pool);
            LimitedPool.create.withArgs(2).returns(bro2Pool);

            const perBrowserLimitedPool = new PerBrowserLimitedPool(config);

            perBrowserLimitedPool.getBrowser('bro1');

            assert.called(bro1Pool.getBrowser);
            assert.notCalled(bro2Pool.getBrowser);
        });
    });

    describe('freeBrowser', () => {
        it('should redirect request to corresponding pool', () => {
            const config = mkConfigStub_({
                bro1: {sessionsPerBrowser: 1},
                bro2: {sessionsPerBrowser: 2}
            });

            const bro1Pool = sinon.createStubInstance(BasicPool);
            const bro2Pool = sinon.createStubInstance(BasicPool);

            LimitedPool.create.withArgs(1).returns(bro1Pool);
            LimitedPool.create.withArgs(2).returns(bro2Pool);

            const perBrowserLimitedPool = new PerBrowserLimitedPool(config);

            const browser = browserWithId('bro1');

            perBrowserLimitedPool.freeBrowser(browser, {foo: 'bar'});

            assert.calledWith(bro1Pool.freeBrowser, browser, {foo: 'bar'});
            assert.notCalled(bro2Pool.freeBrowser);
        });
    });

    describe('cancel', () => {
        it('should cancel all underlying pools', () => {
            const config = mkConfigStub_({
                bro1: {sessionsPerBrowser: 1},
                bro2: {sessionsPerBrowser: 2}
            });

            const bro1Pool = sinon.createStubInstance(BasicPool);
            const bro2Pool = sinon.createStubInstance(BasicPool);

            LimitedPool.create.withArgs(1).returns(bro1Pool);
            LimitedPool.create.withArgs(2).returns(bro2Pool);

            const perBrowserLimitedPool = new PerBrowserLimitedPool(config);

            perBrowserLimitedPool.cancel();

            assert.calledOnce(bro1Pool.cancel);
            assert.calledOnce(bro2Pool.cancel);
        });
    });
});
