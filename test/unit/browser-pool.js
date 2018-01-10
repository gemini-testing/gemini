'use strict';

const BrowserPool = require('lib/browser-pool');
const BrowserFabric = require('lib/browser');
const RunnerEvents = require('lib/constants/events');
const {BrowserPool: CoreBrowserPool, Calibrator} = require('gemini-core');
const AsyncEmitter = require('gemini-core').events.AsyncEmitter;
const _ = require('lodash');
const Promise = require('bluebird');

describe('browser-pool', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(CoreBrowserPool, 'create');
    });

    afterEach(() => sandbox.restore());

    it('should create core browser pool', () => {
        BrowserPool.create();

        assert.calledOnce(CoreBrowserPool.create);
    });

    it('should set gemini log namespace', () => {
        BrowserPool.create();

        assert.calledWith(CoreBrowserPool.create, sinon.match.any, sinon.match({logNamespace: 'gemini'}));
    });

    describe('config', () => {
        it('should pass config system section as is', () => {
            const config = {
                system: {
                    foo: 'bar'
                }
            };

            BrowserPool.create(config);

            assert.calledWith(CoreBrowserPool.create, sinon.match.any, sinon.match({config}));
        });

        it('should pass config browser ids as is', () => {
            const config = {
                getBrowserIds: () => ['foo', 'bar']
            };

            BrowserPool.create(config);

            const passedConfig = CoreBrowserPool.create.firstCall.args[1].config;
            assert.deepEqual(passedConfig.getBrowserIds(), ['foo', 'bar']);
        });

        it('should adopt browser session options', () => {
            const config = {
                forBrowser: () => {
                    return {
                        sessionsPerBrowser: 100500,
                        suitesPerSession: 500100
                    };
                }
            };

            BrowserPool.create(config);

            const passedConfig = CoreBrowserPool.create.firstCall.args[1].config;
            assert.deepEqual(passedConfig.forBrowser(), {
                parallelLimit: 100500,
                sessionUseLimit: 500100
            });
        });
    });

    describe('browser manager', () => {
        const init_ = (opts) => {
            opts = _.defaults(opts, {
                config: {},
                emitter: {}
            });
            BrowserPool.create(opts.config, opts.emitter);
            return CoreBrowserPool.create.firstCall.args[0];
        };

        it('should create browser on request', () => {
            const config = {
                forBrowser: sinon.stub().withArgs('bro').returns({foo: 'bar'})
            };

            const bro = {baz: 'qux'};
            sandbox.stub(BrowserFabric, 'create').withArgs({foo: 'bar'}).returns(bro);

            const browserManager = init_({config});

            const browser = browserManager.create('bro');

            assert.equal(browser, bro);
        });

        it('should launch browser on start', () => {
            const browserManager = init_();

            const browser = {launch: sinon.stub()};
            browserManager.start(browser);

            assert.calledOnce(browser.launch);
            assert.calledWith(browser.launch, sinon.match.instanceOf(Calibrator));
        });

        it('should quit browser', () => {
            const browserManager = init_();

            const browser = {quit: sinon.stub()};
            browserManager.quit(browser);

            assert.calledOnce(browser.quit);
        });

        describe('events', () => {
            it('should emit START_BROWSER on start', () => {
                const emitter = new AsyncEmitter();
                const onBrowserStart = sinon.spy();
                emitter.on(RunnerEvents.START_BROWSER, onBrowserStart);

                const browserManager = init_({emitter});

                const browser = {foo: 'bar'};
                browserManager.onStart(browser);

                assert.calledOnce(onBrowserStart);
                assert.calledWith(onBrowserStart, browser);
            });

            it('should wait START_BROWSER handler', () => {
                const emitter = new AsyncEmitter();
                const spy1 = sinon.spy();
                const spy2 = sinon.spy();

                emitter.on(RunnerEvents.START_BROWSER, () => Promise.delay(10).then(spy1));

                const browserManager = init_({emitter});

                return browserManager.onStart()
                    .then(spy2)
                    .then(() => assert.callOrder(spy1, spy2));
            });

            it('should emit STOP_BROWSER on quit', () => {
                const emitter = new AsyncEmitter();
                const onBrowserQuit = sinon.spy();
                emitter.on(RunnerEvents.STOP_BROWSER, onBrowserQuit);

                const browserManager = init_({emitter});

                const browser = {foo: 'bar'};
                browserManager.onQuit(browser);

                assert.calledOnce(onBrowserQuit);
                assert.calledWith(onBrowserQuit, browser);
            });

            it('should wait STOP_BROWSER handler', () => {
                const emitter = new AsyncEmitter();
                const spy1 = sinon.spy();
                const spy2 = sinon.spy();

                emitter.on(RunnerEvents.STOP_BROWSER, () => Promise.delay(10).then(spy1));

                const browserManager = init_({emitter});

                return browserManager.onQuit()
                    .then(spy2)
                    .then(() => assert.callOrder(spy1, spy2));
            });
        });
    });
});
