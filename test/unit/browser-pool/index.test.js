'use strict';

const BasicPool = require('lib/browser-pool/basic-pool');
const LimitedPool = require('lib/browser-pool/limited-pool');
const PerBrowserLimitedPool = require('lib/browser-pool/per-browser-limited-pool');
const pool = require('lib/browser-pool');
const Calibrator = require('lib/calibrator');
const QEmitter = require('qemitter');

describe('browser-pool', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    function mkConfig(opts) {
        return {
            system: opts || {},
            forBrowser: sinon.stub().returns({id: 'id'}),
            getBrowserIds: sinon.stub().returns(['id'])
        };
    }

    it('should create basic pool', () => {
        const config = mkConfig();
        const emitter = new QEmitter();
        sandbox.spy(BasicPool, 'create');

        pool.create(config, emitter);

        assert.calledOnce(BasicPool.create);
        assert.calledWith(BasicPool.create, config, sinon.match.instanceOf(Calibrator), emitter);
    });

    it('should create pool according perBrowserLimit by default', () => {
        const browserPool = pool.create(mkConfig());

        assert.instanceOf(browserPool, PerBrowserLimitedPool);
    });

    it('should create pool according parallelLimit if that option exist', () => {
        const browserPool = pool.create(mkConfig({
            parallelLimit: 10
        }));

        assert.instanceOf(browserPool, LimitedPool);
    });

    it('should ignore parallelLimit if it value is Infinity', () => {
        const browserPool = pool.create(mkConfig({
            parallelLimit: Infinity
        }));

        assert.instanceOf(browserPool, PerBrowserLimitedPool);
    });
});
