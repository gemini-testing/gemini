'use strict';

const q = require('q');
const QEmitter = require('qemitter');

const Runner = require('lib/runner');
const RunnerEvents = require('lib/constants/runner-events');
const PrivateEvents = require('lib/runner/private-events');
const TestSessionRunner = require('lib/runner/test-session-runner');
const StateProcessor = require('lib/state-processor/state-processor');
const Config = require('lib/config');
const FailCollector = require('lib/fail-collector');

describe('runner', () => {
    const sandbox = sinon.sandbox.create();

    let config;
    let stateProcessor;
    let testSessionRunner;
    let runner;
    let suiteCollectionStub;

    const run_ = (suiteCollection) => {
        return runner.run(suiteCollection || suiteCollectionStub);
    };

    const createTestSessionRunner_ = () => {
        const runner = new QEmitter();
        runner.run = () => q();
        return runner;
    };

    beforeEach(() => {
        config = sinon.createStubInstance(Config);
        testSessionRunner = createTestSessionRunner_();
        stateProcessor = sinon.createStubInstance(StateProcessor);
        runner = new Runner(config, stateProcessor);
        suiteCollectionStub = {allSuites: sinon.stub()};

        sandbox.stub(TestSessionRunner, 'create');
        TestSessionRunner.create.returns(testSessionRunner);

        sandbox.stub(FailCollector.prototype, 'tryToSubmitStateResult');
        sandbox.stub(FailCollector.prototype, 'tryToSubmitError');
    });

    afterEach(() => sandbox.restore());

    describe('run', () => {
        it('should emit `BEGIN` event when tests start', () => {
            const onBegin = sandbox.spy().named('onBegin');
            runner.on(RunnerEvents.BEGIN, onBegin);

            return run_()
                .then(() => assert.calledOnce(onBegin));
        });

        it('should pass total number of states when emitting `BEGIN`', () => {
            const suites = [
                {states: []},
                {states: [1, 2]},
                {states: [3]}
            ];

            suiteCollectionStub.allSuites.returns(suites);

            const onBegin = sandbox.spy().named('onBegin');
            runner.on(RunnerEvents.BEGIN, onBegin);

            return run_(suiteCollectionStub)
                .then(() => assert.calledWith(onBegin, sinon.match({totalStates: 3})));
        });

        it('should pass all browser ids when emitting `BEGIN`', () => {
            runner.config.getBrowserIds
                .returns(['browser1', 'browser2']);

            const onBegin = sandbox.spy().named('onBegin');
            runner.on(RunnerEvents.BEGIN, onBegin);

            return run_().then(() => {
                assert.calledWith(onBegin, sinon.match({
                    browserIds: ['browser1', 'browser2']
                }));
            });
        });

        it('should pass config when emitting `BEGIN`', () => {
            const onBegin = sandbox.spy().named('onBegin');
            runner.on(RunnerEvents.BEGIN, onBegin);

            return run_().then(() => {
                assert.calledWith(onBegin, sinon.match({
                    config: runner.config
                }));
            });
        });

        it('should emit `START_RUNNER` event when tests start', () => {
            const onStartRunner = sandbox.spy().named('onStartRunner');
            runner.on(RunnerEvents.START_RUNNER, onStartRunner);

            return run_()
                .then(() => assert.calledOnce(onStartRunner));
        });

        it('should pass runner when emitting `START_RUNNER`', () => {
            const onStartRunner = sandbox.spy().named('onStartRunner');
            runner.on(RunnerEvents.START_RUNNER, onStartRunner);

            return run_()
                .then(() => assert.calledWith(onStartRunner, runner));
        });

        it('should launch only browsers specified in testBrowsers', () => {
            runner.config.getBrowserIds.returns(['browser1', 'browser2']);
            runner.setTestBrowsers(['browser1']);

            return run_().then(() => {
                assert.calledWith(TestSessionRunner.create, sinon.match.any, ['browser1']);
            });
        });

        it('should run suites in test session runner', () => {
            sandbox.stub(testSessionRunner, 'run').returns(q());

            return run_(suiteCollectionStub).then(() => {
                assert.calledOnce(testSessionRunner.run);
                assert.calledWith(testSessionRunner.run, suiteCollectionStub, stateProcessor);
            });
        });

        it('should emit `END`', () => {
            const onEnd = sandbox.spy();
            runner.on(RunnerEvents.END, onEnd);

            return run_()
                .then(() => assert.calledOnce(onEnd));
        });

        it('should emit `END_RUNNER` event when tests end', () => {
            const onEndRunner = sandbox.spy().named('onEndRunner');
            runner.on(RunnerEvents.END_RUNNER, onEndRunner);

            return run_()
                .then(() => assert.calledOnce(onEndRunner));
        });

        it('should pass runner when emitting `END_RUNNER`', () => {
            const onEndRunner = sandbox.spy().named('onEndRunner');
            runner.on(RunnerEvents.END_RUNNER, onEndRunner);

            return run_()
                .then(() => assert.calledWith(onEndRunner, runner));
        });

        it('should emit events in correct order', () => {
            const begin = sandbox.spy().named('onBegin');
            const end = sandbox.spy().named('onEnd');
            const startRunner = sandbox.spy().named('onStartRunner');
            const endRunner = sandbox.spy().named('onEndRunner');

            runner.on(RunnerEvents.BEGIN, begin);
            runner.on(RunnerEvents.END, end);
            runner.on(RunnerEvents.START_RUNNER, startRunner);
            runner.on(RunnerEvents.END_RUNNER, endRunner);

            return run_()
                .then(() => assert.callOrder(startRunner, begin, end, endRunner));
        });

        describe('retries', () => {
            const mkRetryCandidate_ = () => {
                return {
                    browserId: 'id',
                    suite: {fullName: 'default_name'},
                    state: {name: 'stateName'},
                    equal: false
                };
            };

            const runAndEmit_ = (event, data) => {
                return run_()
                    .then(() => testSessionRunner.emitAndWait(event, data));
            };

            beforeEach(() => config.forBrowser.returns({retry: Infinity}));

            it('should try to submit state result for retry', () => {
                return runAndEmit_(RunnerEvents.TEST_RESULT)
                    .then(() => assert.called(FailCollector.prototype.tryToSubmitStateResult));
            });

            it('should emit `TEST_RESULT` event if it was not submitted for retry', () => {
                const ontestResult = sandbox.spy();
                runner.on(RunnerEvents.TEST_RESULT, ontestResult);

                return runAndEmit_(RunnerEvents.TEST_RESULT)
                    .then(() => assert.calledOnce(ontestResult));
            });

            it('should pass through `UPDATE_RESULT` event', () => {
                const onUpdateResult = sandbox.spy();
                runner.on(RunnerEvents.UPDATE_RESULT, onUpdateResult);

                return runAndEmit_(RunnerEvents.UPDATE_RESULT)
                    .then(() => assert.calledOnce(onUpdateResult));
            });

            it('should try to submit non-critical error for retry', () => {
                return runAndEmit_(RunnerEvents.ERROR)
                    .then(() => assert.called(FailCollector.prototype.tryToSubmitError));
            });

            it('should emit `ERROR` event if non-critical error was not submit for retry', () => {
                const onErr = sandbox.spy();

                runner.on(RunnerEvents.ERROR, onErr);
                return runAndEmit_(RunnerEvents.ERROR)
                    .then(() => assert.called(onErr));
            });

            it('should reject promise if `CRITICAL_ERROR` was not submitted for retry', () => {
                FailCollector.prototype.tryToSubmitError.returns(false);
                return assert.isRejected(runAndEmit_(PrivateEvents.CRITICAL_ERROR));
            });

            it('should try to submit `CRITICAL_ERROR` for retry', () => {
                FailCollector.prototype.tryToSubmitError.returns(false);
                return runAndEmit_(PrivateEvents.CRITICAL_ERROR)
                    .fail(() => assert.called(FailCollector.prototype.tryToSubmitError));
            });

            it('should emit `ERROR` event before failing on critical error', () => {
                const onErr = sandbox.spy();

                runner.on(RunnerEvents.ERROR, onErr);
                return runAndEmit_(RunnerEvents.ERROR)
                    .fail(() => assert.called(onErr));
            });

            describe('`RETRY` event', () => {
                beforeEach(() => {
                    FailCollector.prototype.tryToSubmitStateResult.restore();
                    FailCollector.prototype.tryToSubmitError.restore();
                });

                it('should emit `RETRY` event if candidate was submitted for retry', () => {
                    const onRetry = sandbox.spy();
                    runner.on(RunnerEvents.RETRY, onRetry);

                    return runAndEmit_(RunnerEvents.TEST_RESULT, mkRetryCandidate_())
                        .then(() => assert.called(onRetry));
                });

                it('should add info about retry to `RETRY` event data', () => {
                    const onRetry = sandbox.spy();
                    runner.on(RunnerEvents.RETRY, onRetry);

                    return runAndEmit_(RunnerEvents.TEST_RESULT, mkRetryCandidate_())
                        .then(() => {
                            const retryArgs = onRetry.lastCall.args[0];

                            assert.property(retryArgs, 'attempt');
                            assert.property(retryArgs, 'retriesLeft');
                        });
                });
            });
        });
    });
});
