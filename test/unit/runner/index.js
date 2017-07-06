'use strict';

const Promise = require('bluebird');
const q = require('bluebird-q');
const pool = require('lib/browser-pool');
const Config = require('lib/config');
const Events = require('lib/constants/events');
const Coverage = require('lib/coverage');
const Runner = require('lib/runner');
const BrowserRunner = require('lib/runner/browser-runner');
const StateProcessor = require('lib/state-processor/state-processor');
const RunnerStats = require('lib/stats');
const SuiteMonitor = require('lib/suite-monitor');
const makeStateResult = require('../../util').makeStateResult;

describe('runner', () => {
    const sandbox = sinon.sandbox.create();

    const createRunner = (opts) => {
        opts = opts || {};

        const config = opts.config || sinon.createStubInstance(Config);
        config.getBrowserIds.returns(['default-bro']);

        const stateProcessor = opts.stateProcessor || sinon.createStubInstance(StateProcessor);

        return Runner.create(config, stateProcessor);
    };

    const run = (runner, suiteCollection) => runner.run(suiteCollection || {allSuites: sinon.stub()});

    const stubConfig = (opts) => {
        const config = sinon.createStubInstance(Config);

        config.isCoverageEnabled.returns(opts.isCoverageEnabled);
        config.system = {projectRoot: 'default'};

        return config;
    };

    const stubBrowserRunner = (scenario) => {
        BrowserRunner.prototype.run.callsFake(function() {
            return Promise.resolve(scenario(this));
        });
    };

    const stubBrowserPool = () => {
        return {
            getBrowser: sinon.stub(),
            freeBrowser: sinon.stub(),
            cancel: sinon.stub()
        };
    };

    beforeEach(() => {
        const browserPool = stubBrowserPool();
        sandbox.stub(pool, 'create').returns(browserPool);
        browserPool.cancel.returns(Promise.resolve());

        sandbox.spy(Coverage, 'create');
        sandbox.stub(Coverage.prototype, 'processStats');
        sandbox.stub(Coverage.prototype, 'addStatsForBrowser');

        sandbox.spy(SuiteMonitor, 'create');

        sandbox.spy(BrowserRunner, 'create');
        sandbox.stub(BrowserRunner.prototype, 'run').returns(Promise.resolve());
        sandbox.stub(BrowserRunner.prototype, 'cancel');
    });

    afterEach(() => sandbox.restore());

    describe('constructor', () => {
        it('should create browser pool', () => {
            const runner = createRunner();

            assert.calledOnce(pool.create);
            assert.calledWith(pool.create, runner.config, runner);
        });

        it('should create "Coverage" instance if coverage is enabled', () => {
            const runner = createRunner({config: stubConfig({isCoverageEnabled: true})});

            assert.calledOnce(Coverage.create);
            assert.calledWith(Coverage.create, runner.config);
        });

        it('should not create "Coverage" instance if coverage is disabled', () => {
            createRunner({config: stubConfig({isCoverageEnabled: false})});

            assert.notCalled(Coverage.create);
        });

        it('should create "SuiteMonitor" instance', () => {
            const runner = createRunner();

            assert.calledOnce(SuiteMonitor.create);
            assert.calledWith(SuiteMonitor.create, runner);
        });
    });

    describe('run', () => {
        describe('functionality', () => {
            it('should emit "START_RUNNER" event', () => {
                const runner = createRunner();
                const onStartRunner = sinon.spy().named('onStartRunner');

                runner.on(Events.START_RUNNER, onStartRunner);

                return run(runner).then(() => assert.calledOnce(onStartRunner));
            });

            it('should pass runner when emitting "START_RUNNER" event', () => {
                const runner = createRunner();
                const onStartRunner = sinon.spy().named('onStartRunner');

                runner.on(Events.START_RUNNER, onStartRunner);

                return run(runner).then(() => assert.calledWith(onStartRunner, runner));
            });

            it('should wait until all "START_RUNNER" handlers have finished', () => {
                const runner = createRunner();
                const onStartRunner = sinon.spy().named('onStartRunner');
                const onStartRannerWithDelay = () => Promise.delay(50).then(onStartRunner);
                const onBegin = sinon.spy().named('onBegin');

                runner.on(Events.START_RUNNER, onStartRannerWithDelay);
                runner.on(Events.BEGIN, onBegin);

                return run(runner).then(() => assert.callOrder(onStartRunner, onBegin));
            });

            it('should emit "BEGIN" event', () => {
                const runner = createRunner();
                const onBegin = sinon.spy().named('onBegin');

                runner.on(Events.BEGIN, onBegin);

                return run(runner).then(() => assert.calledOnce(onBegin));
            });

            it('should pass suite collection on "BEGIN" event', () => {
                const runner = createRunner();
                const suiteCollection = {allSuites: sinon.stub()};
                const onBegin = sinon.spy().named('onBegin');

                runner.on(Events.BEGIN, onBegin);

                return run(runner, suiteCollection)
                    .then(() => assert.calledWithMatch(onBegin, {suiteCollection}));
            });

            it('should pass total number of states on "BEGIN" event', () => {
                const runner = createRunner();
                const suiteCollection = {allSuites: sinon.stub()};
                const suites = [
                    {states: []},
                    {states: [1, 2]},
                    {states: [3]}
                ];
                const onBegin = sinon.spy().named('onBegin');

                suiteCollection.allSuites.returns(suites);

                runner.on(Events.BEGIN, onBegin);

                return run(runner, suiteCollection).then(() => assert.calledWithMatch(onBegin, {totalStates: 3}));
            });

            it('should pass all browser ids on "BEGIN" event', () => {
                const runner = createRunner();
                const onBegin = sinon.spy().named('onBegin');

                runner.config.getBrowserIds.returns(['bro1', 'bro2']);

                runner.on(Events.BEGIN, onBegin);

                return run(runner).then(() => assert.calledWithMatch(onBegin, {browserIds: ['bro1', 'bro2']}));
            });

            it('should pass config on "BEGIN" event', () => {
                const runner = createRunner();
                const config = runner.config;
                const onBegin = sinon.spy().named('onBegin');

                runner.on(Events.BEGIN, onBegin);

                return run(runner).then(() => assert.calledWithMatch(onBegin, {config}));
            });

            it('should prepare state processor before running of tests', () => {
                const stateProcessor = sinon.createStubInstance(StateProcessor);
                const runner = createRunner({stateProcessor});

                return run(runner).then(() => assert.callOrder(stateProcessor.prepare, BrowserRunner.prototype.run));
            });

            it('should emit "BEGIN_SESSION" before running of tests', () => {
                const runner = createRunner();
                const onBeginSession = sinon.spy().named('onBeginSession');

                runner.on(Events.BEGIN_SESSION, onBeginSession);

                return run(runner).then(() => assert.calledOnce(onBeginSession));
            });

            it('should create all browser runners', () => {
                pool.create.returns('some-pool');

                const runner = createRunner();
                const config = runner.config;

                runner.config.getBrowserIds.returns(['bro1', 'bro2']);

                return run(runner)
                    .then(() => {
                        assert.calledTwice(BrowserRunner.create);

                        assert.calledWith(BrowserRunner.create, 'bro1', config, 'some-pool');
                        assert.calledWith(BrowserRunner.create, 'bro2', config, 'some-pool');
                    });
            });

            it('should run tests in all browsers', () => {
                const stateProcessor = sinon.createStubInstance(StateProcessor);
                const runner = createRunner({stateProcessor});
                const suiteCollection = {allSuites: sinon.stub()};

                runner.config.getBrowserIds.returns(['bro1', 'bro2']);

                return run(runner, suiteCollection)
                    .then(() => {
                        assert.calledTwice(BrowserRunner.prototype.run);
                        assert.alwaysCalledWith(BrowserRunner.prototype.run, suiteCollection, stateProcessor);
                        assert.notEqual(
                            BrowserRunner.prototype.run.firstCall.thisValue,
                            BrowserRunner.prototype.run.secondCall.thisValue
                        );
                    });
            });

            it('should aggregate statistic for all browsers', () => {
                const emitStateResult_ = (name) => function() {
                    this.emit(Events.ERROR, makeStateResult({name}));
                    return Promise.resolve();
                };

                BrowserRunner.prototype.run
                    .onFirstCall().callsFake(emitStateResult_('some-name'))
                    .onSecondCall().callsFake(emitStateResult_('other-name'));

                const runner = createRunner();
                runner.config.getBrowserIds.returns(['bro1', 'bro2']);

                let testsStatistic;
                runner.on(Events.END, (stat) => testsStatistic = stat);

                return run(runner)
                    .then(() => assert.equal(testsStatistic.total, 2));
            });

            it('should include tests state data emitted from main runner to the statistic', () => {
                const runner = createRunner();

                runner.emit(Events.ERROR, makeStateResult({name: 'some-name'}));

                let testsStatistic;
                runner.on(Events.END, (stat) => testsStatistic = stat);

                return run(runner)
                    .then(() => assert.equal(testsStatistic.total, 1));
            });

            it('should not be immediately rejected if running of tests in some browser was rejected', () => {
                const runner = createRunner();
                const rejected = q.reject();
                const delayed = q.delay(50);

                runner.config.getBrowserIds.returns(['bro1', 'bro2']);

                BrowserRunner.prototype.run.onFirstCall().returns(rejected);
                BrowserRunner.prototype.run.onSecondCall().returns(delayed);

                return run(runner).catch(() => assert.isFalse(delayed.isPending()));
            });

            it('should be rejected with the first error if running of tests in several browsers were rejected', () => {
                const runner = createRunner();
                const firstReject = q.reject('first-runner');
                const secondReject = q.reject('second-runner');

                runner.config.getBrowserIds.returns(['bro1', 'bro2']);

                BrowserRunner.prototype.run.onFirstCall().returns(firstReject);
                BrowserRunner.prototype.run.onSecondCall().returns(secondReject);

                return assert.isRejected(run(runner), /first-runner/);
            });

            it('should emit "END_SESSION" event after running of tests', () => {
                const runner = createRunner();
                const onEndSession = sinon.spy().named('onEndSession');

                runner.on(Events.END_SESSION, onEndSession);

                return run(runner).then(() => assert.callOrder(BrowserRunner.prototype.run, onEndSession));
            });

            it('should unconditionally emit "END_SESSION" event even if running of tests was rejected', () => {
                const runner = createRunner();
                const onEndSession = sinon.spy().named('onEndSession');

                runner.on(Events.END_SESSION, onEndSession);

                BrowserRunner.prototype.run.returns(q.reject());

                return run(runner).catch(() => assert.calledOnce(onEndSession));
            });

            it('should collect coverage', () => {
                const runner = createRunner({config: stubConfig({isCoverageEnabled: true})});

                return run(runner).then(() => assert.calledOnce(Coverage.prototype.processStats));
            });

            it('should be rejected if collecting of coverage fails', () => {
                const runner = createRunner({config: stubConfig({isCoverageEnabled: true})});

                Coverage.prototype.processStats.returns(q.reject());

                return assert.isRejected(run(runner));
            });

            it('should collect coverage after running of tests', () => {
                const runner = createRunner({config: stubConfig({isCoverageEnabled: true})});

                return run(runner)
                    .then(() => assert.callOrder(BrowserRunner.prototype.run, Coverage.prototype.processStats));
            });

            it('should emit "END" event with tests statistic', () => {
                sandbox.stub(RunnerStats.prototype, 'getResult').returns({foo: 'bar'});
                const runner = createRunner({config: stubConfig({isCoverageEnabled: true})});
                const onEnd = sinon.spy().named('onEnd');

                runner.on(Events.END, onEnd);

                return run(runner).then(() => {
                    assert.calledOnce(onEnd);
                    assert.calledWith(onEnd, {foo: 'bar'});
                });
            });

            it('should emit "END" event after collecting of a coverage', () => {
                const runner = createRunner({config: stubConfig({isCoverageEnabled: true})});
                const onEnd = sinon.spy().named('onEnd');

                runner.on(Events.END, onEnd);

                return run(runner).then(() => assert.callOrder(Coverage.prototype.processStats, onEnd));
            });

            it('should emit "END" event after running of tests if coverage is disabled', () => {
                const runner = createRunner({config: stubConfig({isCoverageEnabled: false})});
                const onEnd = sinon.spy().named('onEnd');

                runner.on(Events.END, onEnd);

                return run(runner).then(() => assert.callOrder(BrowserRunner.prototype.run, onEnd));
            });

            it('should unconditionally emit "END" event even if something was rejected earlier', () => {
                const runner = createRunner();
                const onEnd = sinon.spy().named('onEnd');

                runner.on(Events.END, onEnd);

                BrowserRunner.prototype.run.returns(q.reject());

                return run(runner).catch(() => assert.calledOnce(onEnd));
            });

            it('should emit "END_RUNNER" event', () => {
                const runner = createRunner();
                const onEndRunner = sinon.spy().named('onEndRunner');

                runner.on(Events.END_RUNNER, onEndRunner);

                return run(runner).then(() => assert.calledOnce(onEndRunner));
            });

            it('should emit "END_RUNNER" event after "END" one', () => {
                const runner = createRunner();
                const onEnd = sinon.spy().named('onEnd');
                const onEndRunner = sinon.spy().named('onEndRunner');

                runner.on(Events.END, onEnd);
                runner.on(Events.END_RUNNER, onEndRunner);

                return run(runner).then(() => assert.callOrder(onEnd, onEndRunner));
            });

            it('should pass runner when emitting "END_RUNNER" event', () => {
                const runner = createRunner();
                const onEndRunner = sinon.spy().named('onEndRunner');

                runner.on(Events.END_RUNNER, onEndRunner);

                return run(runner).then(() => assert.calledWith(onEndRunner, runner));
            });

            it('should unconditionally emit "END_RUNNER" event even if something was rejected earlier', () => {
                const runner = createRunner();
                const onEndRunner = sinon.spy().named('onEndRunner');

                runner.on(Events.END_RUNNER, onEndRunner);

                BrowserRunner.prototype.run.returns(q.reject());

                return run(runner).catch(() => assert.calledOnce(onEndRunner));
            });

            it('should wait until all "END_RUNNER" handlers have finished', () => {
                const runner = createRunner();
                const onEndRunner = sinon.spy().named('onEndRunner');
                const onEndRunnerWithDelay = () => Promise.delay(50).then(onEndRunner);

                runner.on(Events.END_RUNNER, onEndRunnerWithDelay);

                return run(runner).then(() => assert.called(onEndRunner));
            });
        });

        describe('handling of events from browser runner', () => {
            beforeEach(() => {
                sandbox.stub(RunnerStats.prototype, 'attachRunner');
            });

            const testPassthrough = (event, msg) => {
                it(msg || `${event}`, () => {
                    stubBrowserRunner((runner) => runner.emit(event, {foo: 'bar'}));

                    const runner = createRunner();
                    const onEvent = sinon.spy().named(event);

                    runner.on(event, onEvent);

                    return run(runner)
                        .then(() => {
                            assert.calledOnce(onEvent);
                            assert.calledWith(onEvent, {foo: 'bar'});
                        });
                });
            };

            const testCoverage = (event) => {
                it('should save coverage if it is enabled', () => {
                    stubBrowserRunner((runner) => runner.emit(event, {coverage: 'foo', browserId: 'bar'}));

                    const runner = createRunner({config: stubConfig({isCoverageEnabled: true})});

                    return run(runner)
                        .then(() => {
                            assert.calledOnce(Coverage.prototype.addStatsForBrowser);
                            assert.calledWith(Coverage.prototype.addStatsForBrowser, 'foo', 'bar');
                        });
                });

                it(`should emit "${event}" event after saving of coverage`, () => {
                    stubBrowserRunner((runner) => runner.emit(event, {}));

                    const runner = createRunner({config: stubConfig({isCoverageEnabled: true})});
                    const onEvent = sinon.spy().named(event);

                    runner.on(event, onEvent);

                    return run(runner)
                        .then(() => assert.callOrder(Coverage.prototype.addStatsForBrowser, onEvent));
                });

                it('should not save coverage if it is disabled', () => {
                    stubBrowserRunner((runner) => runner.emit(event));

                    const runner = createRunner({config: stubConfig({isCoverageEnabled: false})});

                    return run(runner).then(() => assert.notCalled(Coverage.prototype.addStatsForBrowser));
                });
            };

            describe('should passthrough', () => {
                [
                    Events.RETRY,
                    Events.BEGIN_SUITE,
                    Events.SKIP_STATE,
                    Events.BEGIN_STATE,
                    Events.END_STATE,
                    Events.INFO,
                    Events.WARNING,
                    Events.ERROR
                ].forEach((event) => testPassthrough(event));
            });

            [
                Events.CAPTURE,
                Events.UPDATE_RESULT
            ].forEach((event) => {
                describe(`on ${event}`, () => {
                    testPassthrough(event, `should passthrough "${event}" event`);

                    testCoverage(event);
                });
            });

            describe('on testResult', () => {
                testPassthrough(Events.TEST_RESULT, 'should passthrough "testResult" event');

                it('should passthrough "endTest" event', () => {
                    stubBrowserRunner((runner) => runner.emit(Events.TEST_RESULT, {foo: 'bar'}));

                    const runner = createRunner();
                    const onEndTest = sinon.spy().named('onEndTest');

                    runner.on(Events.END_TEST, onEndTest);

                    return run(runner)
                        .then(() => {
                            assert.calledOnce(onEndTest);
                            assert.calledWith(onEndTest, {foo: 'bar'});
                        });
                });

                it('should emit "testResult" event after "endTest" one', () => {
                    stubBrowserRunner((runner) => runner.emit(Events.TEST_RESULT));

                    const runner = createRunner();
                    const onEndTest = sinon.spy().named('onEndTest');
                    const onTestResult = sinon.spy().named('onTestResult');

                    runner.on(Events.END_TEST, onEndTest);
                    runner.on(Events.TEST_RESULT, onTestResult);

                    return run(runner).then(() => assert.callOrder(onEndTest, onTestResult));
                });

                testCoverage(Events.TEST_RESULT);
            });
        });
    });

    describe('cancel', () => {
        it('should cancel all created browser runners', () => {
            const runner = createRunner();
            runner.config.getBrowserIds.returns(['bro1', 'bro2']);

            return run(runner)
                .then(() => runner.cancel())
                .then(() => {
                    assert.calledTwice(BrowserRunner.prototype.cancel);

                    assert.notEqual(
                        BrowserRunner.prototype.run.firstCall.thisValue,
                        BrowserRunner.prototype.run.secondCall.thisValue
                    );
                });
        });

        it('should cancel browser pool', () => {
            const browserPool = stubBrowserPool();

            pool.create.returns(browserPool);

            const runner = createRunner();

            runner.cancel();

            assert.calledOnce(browserPool.cancel);
        });

        it('should cancel browser pool after cancelling of browser runners', () => {
            const browserPool = stubBrowserPool();

            pool.create.returns(browserPool);

            const runner = createRunner();

            return run(runner)
                .then(() => runner.cancel())
                .then(() => assert.callOrder(BrowserRunner.prototype.cancel, browserPool.cancel));
        });

        it('should not run tests after cancel', () => {
            const runner = createRunner();

            runner.cancel();

            return run(runner).then(() => assert.notCalled(BrowserRunner.prototype.run));
        });
    });
});
