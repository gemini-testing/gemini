'use strict';

const Promise = require('bluebird');
const TestSessionRunner = require('lib/runner/test-session-runner');
const BrowserRunner = require('lib/runner/browser-runner');
const pool = require('lib/browser-pool');
const BasicPool = require('lib/browser-pool/basic-pool');
const Config = require('lib/config');

describe('runner/TestSessionRunner', () => {
    const sandbox = sinon.sandbox.create();
    let config;

    beforeEach(() => {
        sandbox.stub(pool, 'create');
        config = sinon.createStubInstance(Config);
    });

    afterEach(() => sandbox.restore());

    describe('create', () => {
        beforeEach(() => {
            sandbox.stub(BrowserRunner, 'create');
            BrowserRunner.create.returns(sinon.createStubInstance(BrowserRunner));
        });

        it('should create runner for each browser in config if testBrowsers are not set', () => {
            config.getBrowserIds.returns(['browser1', 'browser2']);

            TestSessionRunner.create(config);

            assert.calledTwice(BrowserRunner.create);
            assert.calledWith(BrowserRunner.create, 'browser1');
            assert.calledWith(BrowserRunner.create, 'browser2');
        });

        it('should launch only browsers specified in testBrowsers', () => {
            config.getBrowserIds.returns(['browser1', 'browser2']);

            TestSessionRunner.create(config, ['browser1']);

            assert.calledOnce(BrowserRunner.create);
            assert.calledWith(BrowserRunner.create, 'browser1');
        });
    });

    describe('run', () => {
        beforeEach(() => {
            sandbox.stub(BrowserRunner.prototype, 'run');
            BrowserRunner.prototype.run.returns(Promise.resolve());
        });

        function run_(suites, stateProcessor) {
            return TestSessionRunner.create(config).run(suites || [], stateProcessor);
        }

        it('should emit `beginSession` event on start runner', () => {
            config.getBrowserIds.returns(['browser1']);

            const onBeginSession = sandbox.spy().named('onBeginSession');
            const runner = TestSessionRunner.create(config);

            runner.on('beginSession', onBeginSession);

            runner.run()
                .then(() => {
                    assert.called(onBeginSession);
                });
        });

        it('shoud run all created runners', () => {
            config.getBrowserIds.returns(['browser1', 'browser2']);

            run_();

            assert.calledTwice(BrowserRunner.prototype.run);
            assert.notEqual(
                BrowserRunner.prototype.run.firstCall.thisValue,
                BrowserRunner.prototype.run.secondCall.thisValue
            );
        });

        it('should run all suites in browser runner', () => {
            config.getBrowserIds.returns(['browser1']);
            const suites = [];

            run_(suites);

            assert.calledWith(BrowserRunner.prototype.run, suites);
        });

        it('should pass through stateProcessor to browserRunner', () => {
            const stateProcessor = 'stateProcessor';

            config.getBrowserIds.returns(['browser']);
            run_([], stateProcessor);

            assert.calledWith(BrowserRunner.prototype.run, sinon.match.any, stateProcessor);
        });

        it('should emit `endSession` event after test session finished', () => {
            config.getBrowserIds.returns(['browser1']);

            const onEndSession = sandbox.spy().named('onEndSession');
            const runner = TestSessionRunner.create(config);

            runner.on('endSession', onEndSession);

            return runner.run()
                .then(() => {
                    assert.called(onEndSession);
                });
        });

        it('should emit `beginSession` and `endSession` events in correct order', () => {
            config.getBrowserIds.returns(['browser1']);

            const onBeginSession = sandbox.spy().named('onBeginSession');
            const onEndSession = sandbox.spy().named('onEndSession');
            const runner = TestSessionRunner.create(config);

            runner.on('beginSession', onBeginSession);
            runner.on('endSession', onEndSession);

            return runner.run()
                .then(() => {
                    assert.callOrder(onBeginSession, onEndSession);
                });
        });

        describe('on error', () => {
            beforeEach(() => {
                config.getBrowserIds.returns(['browser1', 'browser2']);

                BrowserRunner.prototype.run.onFirstCall().returns(Promise.reject());

                pool.create.returns(sinon.createStubInstance(BasicPool));
            });

            it('should be rejected', () => {
                return assert.isRejected(run_());
            });

            it('should cancel all runners', () => {
                sandbox.stub(BrowserRunner.prototype, 'cancel');
                return run_()
                    .fail(() => {
                        assert.calledTwice(BrowserRunner.prototype.cancel);
                    });
            });

            it('should cancel browser pool', () => {
                const browserPool = sinon.createStubInstance(BasicPool);
                pool.create.returns(browserPool);

                return run_()
                    .fail(() => {
                        assert.calledOnce(browserPool.cancel);
                    });
            });
        });
    });
});
