'use strict';

const q = require('q');
const QEmitter = require('qemitter');

const Runner = require('lib/runner');
const TestSessionRunner = require('lib/runner/test-session-runner');
const StateProcessor = require('lib/state-processor/state-processor');
const Config = require('lib/config');
const FailCollector = require('lib/fail-collector');
const util = require('../../util');

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
        it('should emit `begin` event when tests start', () => {
            const onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);

            return run_()
                .then(() => assert.calledOnce(onBegin));
        });

        it('should pass total number of states when emitting `begin`', () => {
            const suites = [
                {states: []},
                {states: [1, 2]},
                {states: [3]}
            ];

            suiteCollectionStub.allSuites.returns(suites);

            const onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);

            return run_(suiteCollectionStub)
                .then(() => assert.calledWith(onBegin, sinon.match({totalStates: 3})));
        });

        it('should pass all browser ids when emitting `begin`', () => {
            runner.config.getBrowserIds
                .returns(['browser1', 'browser2']);

            const onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);

            return run_().then(() => {
                assert.calledWith(onBegin, sinon.match({
                    browserIds: ['browser1', 'browser2']
                }));
            });
        });

        it('should pass config when emitting `begin`', () => {
            const onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);

            return run_().then(() => {
                assert.calledWith(onBegin, sinon.match({
                    config: runner.config
                }));
            });
        });

        it('should launch only browsers specified in testBrowsers', () => {
            runner.config.getBrowserIds.returns(['browser1', 'browser2']);
            runner.setTestBrowsers(['browser1']);

            return run_().then(() => {
                assert.calledWith(TestSessionRunner.create, sinon.match.any, ['browser1']);
            });
        });

        it('should run suites in test session runner', () => {
            const suites = [util.makeSuiteStub()];

            suiteCollectionStub.allSuites.returns(suites);
            sandbox.stub(testSessionRunner, 'run').returns(q());

            return run_(suiteCollectionStub).then(() => {
                assert.calledOnce(testSessionRunner.run);
                assert.calledWith(testSessionRunner.run, suites, stateProcessor);
            });
        });

        it('should emit `end`', () => {
            const onEnd = sandbox.spy();
            runner.on('end', onEnd);

            return run_()
                .then(() => assert.calledOnce(onEnd));
        });

        it('should emit events in correct order', () => {
            const begin = sandbox.spy().named('onBegin');
            const end = sandbox.spy().named('onEnd');

            runner.on('begin', begin);
            runner.on('end', end);

            return run_()
                .then(() => assert.callOrder(begin, end));
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
                return runAndEmit_('endTest')
                    .then(() => assert.called(FailCollector.prototype.tryToSubmitStateResult));
            });

            it('should emit endTest event if it was not submitted for retry', () => {
                const onEndTest = sandbox.spy();
                runner.on('endTest', onEndTest);

                return runAndEmit_('endTest')
                    .then(() => assert.calledOnce(onEndTest));
            });

            it('should pass through updateResult event', () => {
                const onUpdateResult = sandbox.spy();
                runner.on('updateResult', onUpdateResult);

                return runAndEmit_('updateResult')
                    .then(() => assert.calledOnce(onUpdateResult));
            });

            it('should try to submit non-critical error for retry', () => {
                return runAndEmit_('err')
                    .then(() => assert.called(FailCollector.prototype.tryToSubmitError));
            });

            it('should emit `err` event if non-critical error was not submit for retry', () => {
                const onErr = sandbox.spy();

                runner.on('err', onErr);
                return runAndEmit_('err')
                    .then(() => assert.called(onErr));
            });

            it('should reject promise if critical error was not submitted for retry', () => {
                FailCollector.prototype.tryToSubmitError.returns(false);
                return assert.isRejected(runAndEmit_('criticalError'));
            });

            it('should try to submit critical error for retry', () => {
                FailCollector.prototype.tryToSubmitError.returns(false);
                return runAndEmit_('criticalError')
                    .fail(() => assert.called(FailCollector.prototype.tryToSubmitError));
            });

            it('should emit `err` event before failing on critical error', () => {
                const onErr = sandbox.spy();

                runner.on('err', onErr);
                return runAndEmit_('err')
                    .fail(() => assert.called(onErr));
            });

            describe('`retry` event', () => {
                beforeEach(() => {
                    FailCollector.prototype.tryToSubmitStateResult.restore();
                    FailCollector.prototype.tryToSubmitError.restore();
                });

                it('should emit `retry` event if candidate was submitted for retry', () => {
                    const onRetry = sandbox.spy();
                    runner.on('retry', onRetry);

                    return runAndEmit_('endTest', mkRetryCandidate_())
                        .then(() => assert.called(onRetry));
                });

                it('should add info about retry to `retry` event data', () => {
                    const onRetry = sandbox.spy();
                    runner.on('retry', onRetry);

                    return runAndEmit_('endTest', mkRetryCandidate_())
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
