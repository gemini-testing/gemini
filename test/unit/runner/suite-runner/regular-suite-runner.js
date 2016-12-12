'use strict';

const Promise = require('bluebird');

const RegularSuiteRunner = require('lib/runner/suite-runner/regular-suite-runner');
const StateRunnerFactory = require('lib/runner/state-runner');
const StateRunner = require('lib/runner/state-runner/state-runner');
const CaptureSession = require('lib/capture-session');
const BrowserAgent = require('lib/runner/browser-runner/browser-agent');
const NoRefImageError = require('lib/errors/no-ref-image-error');
const util = require('../../../util');
const makeSuiteStub = util.makeSuiteStub;
const rejectedPromise = util.rejectedPromise;

describe('runner/suite-runner/regular-suite-runner', () => {
    const sandbox = sinon.sandbox.create();

    let stateRunner;
    let stateRunnerFactory;

    let browser;

    beforeEach(() => {
        browser = util.browserWithId('default-browser');
        sandbox.stub(browser, 'openRelative');
        browser.openRelative.returns(Promise.resolve());

        sandbox.stub(BrowserAgent.prototype, 'getBrowser');
        sandbox.stub(BrowserAgent.prototype, 'freeBrowser');

        BrowserAgent.prototype.getBrowser.returns(Promise.resolve(browser));
        BrowserAgent.prototype.freeBrowser.returns(Promise.resolve());

        sandbox.stub(CaptureSession.prototype);
        CaptureSession.prototype.runActions.returns(Promise.resolve());
        CaptureSession.prototype.browser = browser;

        stateRunner = sinon.createStubInstance(StateRunner);
        stateRunnerFactory = sandbox.stub(StateRunnerFactory);
        stateRunnerFactory.create.returns(stateRunner);
    });

    afterEach(() => sandbox.restore());

    const mkRunner_ = (suite, browserId) => {
        const browserAgent = new BrowserAgent();
        browserAgent.browserId = browserId || browser.id;

        return RegularSuiteRunner.create(
            suite || makeSuiteStub(),
            browserAgent
        );
    };

    const run_ = (suite, stateProcessor) => {
        suite = suite || makeSuiteStub({
            states: [util.makeStateStub()]
        });

        const runner = mkRunner_(suite);

        return runner.run(stateProcessor);
    };

    describe('run', () => {
        it('should emit `beginSuite` event', () => {
            const onBeginSuite = sinon.spy().named('onBeginSuite');
            const suite = makeSuiteStub();
            const runner = mkRunner_(suite, 'browser');

            runner.on('beginSuite', onBeginSuite);

            return runner.run()
                .then(() => assert.calledWith(onBeginSuite, {suite, browserId: 'browser'}));
        });

        it('should emit `endSuite` event', () => {
            const onEndSuite = sinon.spy().named('onEndSuite');
            const suite = makeSuiteStub();
            const runner = mkRunner_(suite, 'browser');

            runner.on('endSuite', onEndSuite);

            return runner.run()
                .then(() => assert.calledWith(onEndSuite, {suite, browserId: 'browser'}));
        });

        it('should emit events in correct order', () => {
            const onBeginSuite = sinon.spy().named('onBeginSuite');
            const onEndSuite = sinon.spy().named('onEndSuite');
            const runner = mkRunner_();

            runner.on('beginSuite', onBeginSuite);
            runner.on('endSuite', onEndSuite);

            return runner.run()
                .then(() => assert.callOrder(onBeginSuite, onEndSuite));
        });

        it('should get new browser before open url', () => {
            return run_()
                .then(() => assert.callOrder(
                    BrowserAgent.prototype.getBrowser,
                    browser.openRelative
                ));
        });

        it('should open suite url in browser', () => {
            const suite = makeSuiteStub({
                states: [util.makeStateStub()],
                url: '/path'
            });

            return run_(suite)
                .then(() => assert.calledWith(browser.openRelative, '/path'));
        });

        it('should run `before` actions', () => {
            const suite = makeSuiteStub({
                states: [util.makeStateStub()]
            });

            return run_(suite)
                .then(() => assert.calledWith(CaptureSession.prototype.runActions, suite.beforeActions));
        });

        it('should run states', () => {
            const state = util.makeStateStub();
            const suite = makeSuiteStub({states: [state]});

            stateRunnerFactory.create.withArgs(state).returns(stateRunner);

            return run_(suite)
                .then(() => assert.calledOnce(stateRunner.run));
        });

        it('should passthrough capture processor to state runner', () => {
            const suite = makeSuiteStub({states: [util.makeStateStub()]});

            return run_(suite, 'stateProcessor')
                .then(() => assert.calledWith(stateRunner.run, 'stateProcessor'));
        });

        describe('if can not get a browser', () => {
            beforeEach(() => BrowserAgent.prototype.getBrowser.returns(rejectedPromise()));

            it('should pass an error to all states', () => {
                const suiteTree = util.makeSuiteTree({suite: ['first-state', 'second-state']});
                const runner = mkRunner_(suiteTree.suite);
                const onErrorHandler = sinon.spy();

                runner.on('err', onErrorHandler);

                return runner.run()
                    .then(() => {
                        assert.calledTwice(onErrorHandler);
                        assert.calledWithMatch(onErrorHandler, {state: {name: 'first-state'}});
                        assert.calledWithMatch(onErrorHandler, {state: {name: 'second-state'}});
                    });
            });

            it('should pass a browser id to an error', () => {
                const state = util.makeStateStub();
                const runner = mkRunner_(state.suite, 'browser');
                const onErrorHandler = sinon.spy();

                runner.on('err', onErrorHandler);

                return runner.run()
                    .then(() => assert.calledWithMatch(onErrorHandler, {browserId: 'browser'}));
            });

            it('should not run states', () => {
                return run_()
                    .then(() => assert.notCalled(stateRunner.run));
            });
        });

        describe('if can not open url in a browser', () => {
            beforeEach(() => {
                browser.openRelative.returns(rejectedPromise());
            });

            it('should pass an error to all states', () => {
                const suiteTree = util.makeSuiteTree({suite: ['first-state', 'second-state']});
                const runner = mkRunner_(suiteTree.suite);
                const onErrorHandler = sinon.spy();

                runner.on('err', onErrorHandler);

                return runner.run()
                    .then(() => {
                        assert.calledTwice(onErrorHandler);
                        assert.calledWithMatch(onErrorHandler, {state: {name: 'first-state'}});
                        assert.calledWithMatch(onErrorHandler, {state: {name: 'second-state'}});
                    });
            });

            it('should pass a session id to an error', () => {
                const state = util.makeStateStub();
                const runner = mkRunner_(state.suite);
                const onErrorHandler = sinon.spy();

                runner.on('err', onErrorHandler);
                browser.sessionId = 100500;

                return runner.run()
                    .then(() => assert.calledWithMatch(onErrorHandler, {sessionId: 100500}));
            });

            it('should not run states', () => {
                return run_()
                    .then(() => assert.notCalled(stateRunner.run));
            });
        });

        describe('if `beforeActions` failed', () => {
            let suite;

            beforeEach(() => {
                suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

                CaptureSession.prototype.runActions.withArgs(suite.beforeActions).returns(rejectedPromise());
            });

            it('should pass an error to all states', () => {
                const suiteTree = util.makeSuiteTree({suite: ['first-state', 'second-state']});
                const runner = mkRunner_(suiteTree.suite);
                const onErrorHandler = sinon.spy();

                runner.on('err', onErrorHandler);

                return runner.run()
                    .then(() => {
                        assert.calledTwice(onErrorHandler);
                        assert.calledWithMatch(onErrorHandler, {state: {name: 'first-state'}});
                        assert.calledWithMatch(onErrorHandler, {state: {name: 'second-state'}});
                    });
            });

            it('should pass a session id to an error', () => {
                const runner = mkRunner_(suite);
                const onErrorHandler = sinon.spy();

                runner.on('err', onErrorHandler);
                browser.sessionId = 100500;

                return runner.run()
                    .then(() => assert.calledWithMatch(onErrorHandler, {sessionId: 100500}));
            });

            it('should not run states', () => {
                return run_(suite)
                    .catch(() => assert.notCalled(stateRunner.run));
            });

            it('should not run `afterActions`', () => {
                return run_(suite)
                    .catch(() => {
                        assert.neverCalledWith(CaptureSession.prototype.runActions, suite.afterActions);
                    });
            });

            it('should not run post actions', () => {
                return run_(suite)
                    .catch(() => assert.notCalled(CaptureSession.prototype.runPostActions));
            });
        });

        it('should run next state only after previous has been finished', () => {
            const suite = makeSuiteStub();
            const state1 = util.makeStateStub(suite);
            const state2 = util.makeStateStub(suite);
            const mediator = sinon.spy();

            stateRunner.run.onFirstCall().returns(Promise.delay(50).then(mediator));

            return run_(suite)
                .then(() => {
                    assert.callOrder(
                        stateRunnerFactory.create.withArgs(state1).returns(stateRunner).named('stateRunner1'),
                        mediator.named('middle function'),
                        stateRunnerFactory.create.withArgs(state2).returns(stateRunner).named('stateRunner2')
                    );
                });
        });

        it('should not run state after failed state', () => {
            const state1 = util.makeStateStub();
            const state2 = util.makeStateStub();
            const suite = makeSuiteStub({states: [state1, state2]});

            stateRunner.run.withArgs(state1).returns(rejectedPromise());

            return run_(suite)
                .catch(() => assert.neverCalledWith(stateRunner.run, state2));
        });

        describe('afterActions', () => {
            it('should perform afterActions', () => {
                const suite = makeSuiteStub({states: [util.makeStateStub()]});

                return run_(suite)
                    .then(() => {
                        assert.calledWith(CaptureSession.prototype.runActions, suite.afterActions);
                    });
            });

            it('should perform afterActions even if state failed', () => {
                const suite = makeSuiteStub({states: [util.makeStateStub()]});

                stateRunner.run.returns(rejectedPromise());

                return run_(suite)
                    .catch(() => assert.calledWith(CaptureSession.prototype.runActions, suite.afterActions));
            });

            it('should pass an error to all states if `afterActions` failed', () => {
                const suiteTree = util.makeSuiteTree({suite: ['first-state', 'second-state']});
                const runner = mkRunner_(suiteTree.suite);
                const onErrorHandler = sinon.spy();

                CaptureSession.prototype.runActions.withArgs(suiteTree.suite.afterActions)
                    .returns(rejectedPromise());

                runner.on('err', onErrorHandler);

                return runner.run()
                    .then(() => {
                        assert.calledWith(onErrorHandler);
                        assert.calledWithMatch(onErrorHandler, {state: {name: 'first-state'}});
                        assert.calledWithMatch(onErrorHandler, {state: {name: 'second-state'}});
                    });
            });
        });

        describe('postActions', () => {
            it('should run post actions', () => {
                return run_()
                    .then(() => assert.calledOnce(CaptureSession.prototype.runPostActions));
            });

            it('should pass an error to all states if post actions failed', () => {
                const suiteTree = util.makeSuiteTree({suite: ['first-state', 'second-state']});
                const runner = mkRunner_(suiteTree.suite);
                const onErrorHandler = sinon.spy();

                CaptureSession.prototype.runPostActions.returns(rejectedPromise());

                runner.on('err', onErrorHandler);

                return runner.run()
                    .then(() => {
                        assert.calledTwice(onErrorHandler);
                        assert.calledWithMatch(onErrorHandler, {state: {name: 'first-state'}});
                        assert.calledWithMatch(onErrorHandler, {state: {name: 'second-state'}});
                    });
            });

            it('should run post actions if state failed', () => {
                stateRunner.run.returns(rejectedPromise());

                return run_()
                    .catch(() => assert.calledOnce(CaptureSession.prototype.runPostActions));
            });

            it('should run post actions if `afterActions` failed', () => {
                const suite = makeSuiteStub({states: [util.makeStateStub()]});

                CaptureSession.prototype.runActions.withArgs(suite.afterActions).returns(rejectedPromise());

                return run_(suite)
                    .catch(() => assert.calledOnce(CaptureSession.prototype.runPostActions));
            });

            it('should pass an afterActions error to all states if afterActions and postActions failed', () => {
                const suite = util.makeSuiteStub({states: [util.makeStateStub()]});
                const runner = mkRunner_(suite);
                const onErrorHandler = sinon.spy();

                CaptureSession.prototype.runActions.withArgs(suite.afterActions)
                    .returns(rejectedPromise('after-actions-error'));
                CaptureSession.prototype.runPostActions.returns(rejectedPromise('post-actions-error'));

                runner.on('err', onErrorHandler);

                return runner.run()
                    .then(() => {
                        assert.calledWithMatch(onErrorHandler, {message: 'after-actions-error'});
                        assert.neverCalledWithMatch(onErrorHandler, {message: 'post-actions-error'});
                    });
            });
        });

        describe('freeBrowser', () => {
            it('should free browser after all', () => {
                return run_()
                    .then(() => {
                        assert.callOrder(
                            CaptureSession.prototype.runPostActions,
                            BrowserAgent.prototype.freeBrowser
                        );
                    });
            });

            it('should free browser if run states failed', () => {
                stateRunner.run.returns(rejectedPromise());

                return run_()
                    .catch(() => assert.calledOnce(BrowserAgent.prototype.freeBrowser));
            });

            it('should invalidate session after error in test', () => {
                CaptureSession.prototype.runActions.returns(rejectedPromise());

                return run_()
                    .catch(() => {
                        assert.calledWith(BrowserAgent.prototype.freeBrowser, sinon.match.any, {force: true});
                    });
            });

            it('should not invalidate session if reference image does not exist', () => {
                CaptureSession.prototype.runActions.returns(rejectedPromise(new NoRefImageError()));

                return run_()
                    .then(() => {
                        assert.calledWith(BrowserAgent.prototype.freeBrowser, sinon.match.any, {force: false});
                    });
            });
        });

        it('should add `browserId` and `sessionId` to error if something failed', () => {
            browser.sessionId = 'test-session-id';
            CaptureSession.prototype.runActions.returns(rejectedPromise('test_error'));

            return run_()
                .catch((e) => assert.deepEqual(e, {browserId: 'default-browser', sessionId: 'test-session-id'}));
        });
    });
});
