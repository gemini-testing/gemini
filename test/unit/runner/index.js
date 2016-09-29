'use strict';

const q = require('bluebird-q');
const QEmitter = require('qemitter');

const Runner = require('lib/runner');
const Events = require('lib/constants/events');
const TestSessionRunner = require('lib/runner/test-session-runner');
const StateProcessor = require('lib/state-processor/state-processor');
const Config = require('lib/config');

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
    });

    afterEach(() => sandbox.restore());

    describe('run', () => {
        it('should emit `BEGIN` event when tests start', () => {
            const onBegin = sandbox.spy().named('onBegin');
            runner.on(Events.BEGIN, onBegin);

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
            runner.on(Events.BEGIN, onBegin);

            return run_(suiteCollectionStub)
                .then(() => assert.calledWith(onBegin, sinon.match({totalStates: 3})));
        });

        it('should pass all browser ids when emitting `BEGIN`', () => {
            runner.config.getBrowserIds
                .returns(['browser1', 'browser2']);

            const onBegin = sandbox.spy().named('onBegin');
            runner.on(Events.BEGIN, onBegin);

            return run_().then(() => {
                assert.calledWith(onBegin, sinon.match({
                    browserIds: ['browser1', 'browser2']
                }));
            });
        });

        it('should pass config when emitting `BEGIN`', () => {
            const onBegin = sandbox.spy().named('onBegin');
            runner.on(Events.BEGIN, onBegin);

            return run_().then(() => {
                assert.calledWith(onBegin, sinon.match({
                    config: runner.config
                }));
            });
        });

        it('should emit `START_RUNNER` event when tests start', () => {
            const onStartRunner = sandbox.spy().named('onStartRunner');
            runner.on(Events.START_RUNNER, onStartRunner);

            return run_()
                .then(() => assert.calledOnce(onStartRunner));
        });

        it('should pass runner when emitting `START_RUNNER`', () => {
            const onStartRunner = sandbox.spy().named('onStartRunner');
            runner.on(Events.START_RUNNER, onStartRunner);

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
            runner.on(Events.END, onEnd);

            return run_()
                .then(() => assert.calledOnce(onEnd));
        });

        it('should emit `END_RUNNER` event when tests end', () => {
            const onEndRunner = sandbox.spy().named('onEndRunner');
            runner.on(Events.END_RUNNER, onEndRunner);

            return run_()
                .then(() => assert.calledOnce(onEndRunner));
        });

        it('should pass runner when emitting `END_RUNNER`', () => {
            const onEndRunner = sandbox.spy().named('onEndRunner');
            runner.on(Events.END_RUNNER, onEndRunner);

            return run_()
                .then(() => assert.calledWith(onEndRunner, runner));
        });

        it('should emit events in correct order', () => {
            const begin = sandbox.spy().named('onBegin');
            const end = sandbox.spy().named('onEnd');
            const startRunner = sandbox.spy().named('onStartRunner');
            const endRunner = sandbox.spy().named('onEndRunner');

            runner.on(Events.BEGIN, begin);
            runner.on(Events.END, end);
            runner.on(Events.START_RUNNER, startRunner);
            runner.on(Events.END_RUNNER, endRunner);

            return run_()
                .then(() => assert.callOrder(startRunner, begin, end, endRunner));
        });
    });
});
