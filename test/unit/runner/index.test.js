'use strict';
var q = require('q'),
    QEmitter = require('qemitter'),
    Runner = require('../../../src/runner'),
    TestSessionRunner = require('../../../src/runner/test-session-runner'),
    Tester = require('../../../src/capture-processor/tester'),
    Config = require('../../../src/config'),
    FailCollector = require('../../../src/fail-collector');

describe('runner', function() {
    var sandbox = sinon.sandbox.create(),
        config,
        captureProcessor,
        testSessionRunner,
        runner;

    function run_(suites) {
        return runner.run(suites || []);
    }

    function createCaptureProcessor_() {
        var captureProcessor = sinon.createStubInstance(Tester);

        captureProcessor.getProcessedCaptureEventName.returns('onCaptureProcessed');
        captureProcessor.processCapture.returns(q());
        return captureProcessor;
    }

    function createTestSessionRunner_() {
        var runner = new QEmitter();
        runner.run = function() {
            return q();
        };
        return runner;
    }

    beforeEach(function() {
        config = sinon.createStubInstance(Config);
        testSessionRunner = createTestSessionRunner_();
        captureProcessor = createCaptureProcessor_();
        runner = new Runner(config, captureProcessor);

        sandbox.stub(TestSessionRunner, 'create');
        TestSessionRunner.create.returns(testSessionRunner);

        sandbox.stub(FailCollector.prototype, 'tryToSubmitCapture');
        sandbox.stub(FailCollector.prototype, 'tryToSubmitError');
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('run', function() {
        it('should emit `begin` event when tests start', function() {
            var onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);
            return run_().then(function() {
                assert.calledOnce(onBegin);
            });
        });

        it('should pass total number of states when emitting `begin`', function() {
            var suites = [
                {states: []},
                {states: [1, 2]},
                {states: [3]}
            ];

            var onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);

            return run_(suites).then(function() {
                assert.calledWith(onBegin, sinon.match({totalStates: 3}));
            });
        });

        it('should pass all browser ids when emitting `begin`', function() {
            runner.config.getBrowserIds
                .returns(['browser1', 'browser2']);

            var onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);

            return run_().then(function() {
                assert.calledWith(onBegin, sinon.match({
                    browserIds: ['browser1', 'browser2']
                }));
            });
        });

        it('should pass config when emitting `begin`', function() {
            var onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);

            return run_().then(function() {
                assert.calledWith(onBegin, sinon.match({
                    config: runner.config
                }));
            });
        });

        it('should launch only browsers specified in testBrowsers', function() {
            runner.config.getBrowserIds
                .returns(['browser1', 'browser2']);
            runner.setTestBrowsers(['browser1']);

            return run_().then(function() {
                assert.calledWith(TestSessionRunner.create, sinon.match.any, ['browser1']);
            });
        });

        it('should emit `end`', function() {
            var onEnd = sandbox.spy();
            runner.on('end', onEnd);

            return run_().then(function() {
                assert.calledOnce(onEnd);
            });
        });

        it('should emit events in correct order', function() {
            var begin = sandbox.spy().named('onBegin'),
                end = sandbox.spy().named('onEnd');

            runner.on('begin', begin);
            runner.on('end', end);

            return run_().then(function() {
                assert.callOrder(begin, end);
            });
        });

        describe('retries', function() {
            function mkRetryCandidate_() {
                return {
                    browserId: 'id',
                    suite: {fullName: 'default_name'},
                    equal: false
                };
            }

            function runAndEmit_(event) {
                return run_().then(function() {
                    return testSessionRunner.emitAndWait(event);
                });
            }

            beforeEach(function() {
                config.forBrowser.returns({retry: Infinity});
            });

            it('should try to submit processed capture for retry', function() {
                return runAndEmit_('captureData')
                    .then(function() {
                        assert.called(FailCollector.prototype.tryToSubmitCapture);
                    });
            });

            it('should emit processed capture event if capture was not submitted for retry', function() {
                var onProcessedCapture = sandbox.spy();

                runner.on('onCaptureProcessed', onProcessedCapture);

                return runAndEmit_('captureData')
                    .then(function() {
                        assert.called(onProcessedCapture);
                    });
            });

            it('should try to submit non-critical error for retry', function() {
                return runAndEmit_('err')
                    .then(function() {
                        assert.called(FailCollector.prototype.tryToSubmitError);
                    });
            });

            it('should emit `err` event if non-critical error was not submit for retry', function() {
                var onErr = sandbox.spy();

                runner.on('err', onErr);
                return runAndEmit_('err')
                    .then(function() {
                        assert.called(onErr);
                    });
            });

            it('should try to submit critical error for retry', function() {
                return runAndEmit_('criticalError')
                    .fail(function() { //promise rejected if failed to submit critical for retry
                        assert.called(FailCollector.prototype.tryToSubmitError);
                    });
            });

            it('should emit `err` event before failing on critical error', function() {
                var onErr = sandbox.spy();

                runner.on('err', onErr);
                return runAndEmit_('err')
                    .fail(function() {
                        assert.called(onErr);
                    });
            });

            it('should reject promise if critical error was not submitted for retry', function() {
                return assert.isRejected(runAndEmit_('criticalError'));
            });

            describe('`retry` event', function() {
                beforeEach(function() {
                    FailCollector.prototype.tryToSubmitCapture.restore();
                    FailCollector.prototype.tryToSubmitError.restore();
                });

                it('should emit `retry` event if candidate was submitted for retry', function() {
                    captureProcessor.processCapture.returns(q(mkRetryCandidate_()));

                    var onRetry = sandbox.spy();
                    runner.on('retry', onRetry);

                    return runAndEmit_('captureData')
                        .then(function() {
                            assert.called(onRetry);
                        });
                });

                it('should add info about retry to `retry` event data', function() {
                    captureProcessor.processCapture.returns(q(mkRetryCandidate_()));

                    var onRetry = sandbox.spy();
                    runner.on('retry', onRetry);

                    return runAndEmit_('captureData')
                        .then(function() {
                            assert.calledWithMatch(onRetry, {attempt: 1, retriesLeft: Infinity});
                        });
                });
            });
        });
    });
});
