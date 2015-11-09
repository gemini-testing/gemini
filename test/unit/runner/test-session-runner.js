'use strict';
var q = require('q'),
    TestSessionRunner = require('../../../lib/runner/test-session-runner'),
    BrowserRunner = require('../../../lib/runner/browser-runner'),
    pool = require('../../../lib/browser-pool'),
    Pool = require('../../../lib/browser-pool/pool'),
    Config = require('../../../lib/config');

describe('runner/TestSessionRunner', function() {
    var sandbox = sinon.sandbox.create(),
        config;

    beforeEach(function() {
        sandbox.stub(pool, 'create');
        config = sinon.createStubInstance(Config);
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('create', function() {
        beforeEach(function() {
            sandbox.stub(BrowserRunner, 'create');
            BrowserRunner.create.returns(sinon.createStubInstance(BrowserRunner));
        });

        it('should create runner for each browser in config if testBrowsers are not set', function() {
            config.getBrowserIds
                .returns(['browser1', 'browser2']);

            TestSessionRunner.create(config);

            assert.calledTwice(BrowserRunner.create);
            assert.calledWith(BrowserRunner.create, 'browser1');
            assert.calledWith(BrowserRunner.create, 'browser2');
        });

        it('should launch only browsers specified in testBrowsers', function() {
            config.getBrowserIds
                .returns(['browser1', 'browser2']);

            TestSessionRunner.create(config, ['browser1']);

            assert.calledOnce(BrowserRunner.create);
            assert.calledWith(BrowserRunner.create, 'browser1');
        });
    });

    describe('run', function() {
        beforeEach(function() {
            sandbox.stub(BrowserRunner.prototype);
            BrowserRunner.prototype.run.returns(q.resolve());
        });

        function run_(suites) {
            return TestSessionRunner.create(config).run(suites || []);
        }

        it('shoud run all created runners', function() {
            config.getBrowserIds
                .returns(['browser1', 'browser2']);

            run_();

            assert.calledTwice(BrowserRunner.prototype.run);
            assert.notEqual(
                BrowserRunner.prototype.run.firstCall.thisValue,
                BrowserRunner.prototype.run.secondCall.thisValue
            );
        });

        it('should run all suites in browser runner', function() {
            config.getBrowserIds
                .returns(['browser1']);
            var suites = [];

            run_(suites);

            assert.calledWith(BrowserRunner.prototype.run, suites);
        });

        describe('on error', function() {
            beforeEach(function() {
                config.getBrowserIds
                    .returns(['browser1', 'browser2']);

                BrowserRunner.prototype.run
                    .onFirstCall().returns(q.reject());

                pool.create.returns(sinon.createStubInstance(Pool));
            });

            it('should be rejected', function() {
                return assert.isRejected(run_());
            });

            it('should cancel all runners', function() {
                return run_()
                    .fail(function() {
                        assert.calledTwice(BrowserRunner.prototype.cancel);
                    });
            });

            it('should cancel browser pool', function() {
                var browserPool = sinon.createStubInstance(Pool);
                pool.create.returns(browserPool);

                return run_()
                    .fail(function() {
                        assert.calledOnce(browserPool.cancel);
                    });
            });
        });
    });
});
