'use strict';
var q = require('q'),
    CaptureSession = require('../../../../lib/capture-session'),
    suiteRunner = require('../../../../lib/runner/suite-runner'),
    StateRunner = require('../../../../lib/runner/state-runner/state-runner'),
    BrowserAgent = require('../../../../lib/runner/browser-runner/browser-agent'),
    Config = require('../../../../lib/config'),
    util = require('../../../util'),
    makeSuiteStub = util.makeSuiteStub;

describe('runner/suite-runner/regular-suite-runner', function() {
    var sandbox = sinon.sandbox.create(),
        browser;

    beforeEach(function() {
        browser = util.browserWithId('default-browser');
        sandbox.stub(browser, 'openRelative');
        browser.openRelative.returns(q.resolve());

        sandbox.stub(BrowserAgent.prototype);
        BrowserAgent.prototype.getBrowser.returns(q.resolve(browser));
        BrowserAgent.prototype.freeBrowser.returns(q.resolve());

        sandbox.stub(StateRunner.prototype);
        StateRunner.prototype.run.returns(q.resolve());

        sandbox.stub(CaptureSession.prototype);
        CaptureSession.prototype.runActions.returns(q.resolve());
        CaptureSession.prototype.browser = {};
    });

    afterEach(function() {
        sandbox.restore();
    });

    function mkRunner_(suite, browserId) {
        var browserAgent = new BrowserAgent();
        browserAgent.browserId = browserId || browser.id;

        return suiteRunner.create(
            suite || makeSuiteStub(),
            browserAgent,
            sinon.createStubInstance(Config)
        );
    }

    function run_(suite, captureProcessor) {
        suite = suite || makeSuiteStub({
            states: [util.makeStateStub()]
        });

        var runner = mkRunner_(suite);
        return runner.run(captureProcessor);
    }

    describe('run', function() {
        it('should emit `beginSuite` event', function() {
            var onBeginSuite = sinon.spy().named('onBeginSuite'),
                suite = makeSuiteStub(),
                runner = mkRunner_(suite, 'browser');

            runner.on('beginSuite', onBeginSuite);

            return runner.run()
                .then(function() {
                    assert.calledWith(onBeginSuite, {
                        suite: suite,
                        browserId: 'browser'
                    });
                });
        });

        it('should emit `endSuite` event', function() {
            var onEndSuite = sinon.spy().named('onEndSuite'),
                suite = makeSuiteStub(),
                runner = mkRunner_(suite, 'browser');

            runner.on('endSuite', onEndSuite);

            return runner.run()
                .then(function() {
                    assert.calledWith(onEndSuite, {
                        suite: suite,
                        browserId: 'browser'
                    });
                });
        });

        it('should emit events in correct order', function() {
            var onBeginSuite = sinon.spy().named('onBeginSuite'),
                onEndSuite = sinon.spy().named('onEndSuite'),
                runner = mkRunner_();

            runner.on('beginSuite', onBeginSuite);
            runner.on('endSuite', onEndSuite);

            return runner.run()
                .then(function() {
                    assert.callOrder(
                        onBeginSuite,
                        onEndSuite
                    );
                });
        });

        it('should get new browser before open url', function() {
            return run_()
                .then(function() {
                    assert.callOrder(
                        BrowserAgent.prototype.getBrowser,
                        browser.openRelative
                    );
                });
        });

        it('should open suite url in browser', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()],
                    url: '/path'
                });

            return run_(suite)
                .then(function() {
                    assert.calledWith(browser.openRelative, '/path');
                });
        });

        it('should not call any actions if no states', function() {
            var suite = makeSuiteStub();

            return run_(suite)
                .then(function() {
                    assert.notCalled(CaptureSession.prototype.runActions);
                });
        });

        it('should run `before` actions if there are some states', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

            return run_(suite)
                .then(function() {
                    assert.calledWith(CaptureSession.prototype.runActions, suite.beforeActions);
                });
        });

        it('should run states', function() {
            var state = util.makeStateStub(),
                suite = makeSuiteStub({
                    states: [state]
                });

            return run_(suite)
                .then(function() {
                    assert.calledWith(StateRunner.prototype.__constructor, state);
                    assert.calledOnce(StateRunner.prototype.run);
                });
        });

        it('should passthrough capture processor to state runner', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

            return run_(suite, 'captureProcessor')
                .then(function() {
                    assert.calledWith(StateRunner.prototype.run, 'captureProcessor');
                });
        });

        describe('if `beforeActions` failed', function() {
            var suite;

            beforeEach(function() {
                suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

                CaptureSession.prototype.runActions.withArgs(suite.beforeActions).returns(q.reject());
            });

            it('should fail', function() {
                CaptureSession.prototype.runActions.withArgs(suite.beforeActions).returns(q.reject('some-error'));

                return assert.isRejected(run_(suite), /some-error/);
            });

            it('should not run states', function() {
                return run_(suite)
                    .fail(function() {
                        assert.notCalled(StateRunner.prototype.run);
                    });
            });

            it('should not run `afterActions`', function() {
                return run_(suite)
                    .fail(function() {
                        assert.neverCalledWith(CaptureSession.prototype.runActions, suite.afterActions);
                    });
            });

            it('should not run post actions', function() {
                return run_(suite)
                    .fail(function() {
                        assert.notCalled(CaptureSession.prototype.runPostActions);
                    });
            });
        });

        it('should run next state only after previous has been finished', function() {
            var suite = makeSuiteStub(),
                state1 = util.makeStateStub(suite),
                state2 = util.makeStateStub(suite),
                mediator = sinon.spy();

            StateRunner.prototype.run.onFirstCall().returns(q.delay(1).then(mediator));

            return run_(suite)
                .then(function() {
                    assert.callOrder(
                        StateRunner.prototype.__constructor.withArgs(state1).named('state1 runner'),
                        mediator.named('middle function'),
                        StateRunner.prototype.__constructor.withArgs(state2).named('state2 runner')
                    );
                });
        });

        it('should not run states after cancel', function() {
            var state = util.makeStateStub(),
                suite = makeSuiteStub({
                    states: [state]
                }),
                runner = mkRunner_(suite);

            runner.cancel();

            return runner.run()
                .then(function() {
                    assert.notCalled(StateRunner.prototype.run);
                });
        });

        it('should fail if some state failed', function() {
            var state = util.makeStateStub(),
                suite = makeSuiteStub({
                    states: [state]
                });

            StateRunner.prototype.run.returns(q.reject('some-error'));

            return assert.isRejected(run_(suite), /some-error/);
        });

        it('should not run state after failed state', function() {
            var state1 = util.makeStateStub(),
                state2 = util.makeStateStub(),
                suite = makeSuiteStub({
                    states: [state1, state2]
                });

            StateRunner.prototype.run.withArgs(state1).returns(q.reject());

            return run_(suite)
                .fail(function() {
                    assert.neverCalledWith(StateRunner.prototype.run, state2);
                });
        });

        describe('afterActions', function() {
            it('should perform afterActions', function() {
                var suite = makeSuiteStub({
                        states: [util.makeStateStub()]
                    });

                return run_(suite)
                    .then(function() {
                        assert.calledWith(CaptureSession.prototype.runActions, suite.afterActions);
                    });
            });

            it('should perform afterActions even if state failed', function() {
                var suite = makeSuiteStub({
                        states: [util.makeStateStub()]
                    });

                StateRunner.prototype.run.returns(q.reject());

                return run_(suite)
                    .fail(function() {
                        assert.calledWith(CaptureSession.prototype.runActions, suite.afterActions);
                    });
            });

            it('should fail if `afterActions` failed', function() {
                var state = util.makeStateStub(),
                    suite = makeSuiteStub({
                        states: [state]
                    });

                CaptureSession.prototype.runActions.withArgs(suite.afterActions)
                    .returns(q.reject('some-error'));

                return assert.isRejected(run_(suite), /some-error/);
            });

            it('should reject with state error if state and `afterActions` failed', function() {
                var suite = makeSuiteStub({
                        states: [util.makeStateStub()]
                    });

                StateRunner.prototype.run.returns(q.reject('state-error'));
                CaptureSession.prototype.runActions.withArgs(suite.afterActions)
                    .returns(q.reject('after-actions-error'));

                return assert.isRejected(run_(suite), /state-error/);
            });
        });

        describe('postActions', function() {
            it('should run post actions', function() {
                return run_()
                    .then(function() {
                        assert.calledOnce(CaptureSession.prototype.runPostActions);
                    });
            });

            it('should fail if post actions failed', function() {
                CaptureSession.prototype.runPostActions.returns(q.reject('some-error'));

                return assert.isRejected(run_(), /some-error/);
            });

            it('should run post actions if state failed', function() {
                StateRunner.prototype.run.returns(q.reject());

                return run_()
                    .fail(function() {
                        assert.calledOnce(CaptureSession.prototype.runPostActions);
                    });
            });

            it('should run post actions if `afterActions` failed', function() {
                var suite = makeSuiteStub({
                        states: [util.makeStateStub()]
                    });

                CaptureSession.prototype.runActions.withArgs(suite.afterActions).returns(q.reject());

                return run_(suite)
                    .fail(function() {
                        assert.calledOnce(CaptureSession.prototype.runPostActions);
                    });
            });

            it('should reject with state error if state and post actions failed', function() {
                StateRunner.prototype.run.returns(q.reject('state-error'));
                CaptureSession.prototype.runPostActions.returns(q.reject('post-actions-error'));

                return assert.isRejected(run_(), /state-error/);
            });

            it('should reject with afterActions error if afterActions and postActions failed', function() {
                var suite = makeSuiteStub({
                        states: [util.makeStateStub()]
                    });

                CaptureSession.prototype.runActions.withArgs(suite.afterActions)
                    .returns(q.reject('after-actions-error'));
                CaptureSession.prototype.runPostActions.returns(q.reject('post-actions-error'));

                return assert.isRejected(run_(suite), /after-actions-error/);
            });
        });

        describe('freeBrowser', function() {
            it('should free browser after all', function() {
                return run_()
                    .then(function() {
                        assert.callOrder(
                            CaptureSession.prototype.runPostActions,
                            BrowserAgent.prototype.freeBrowser
                        );
                    });
            });

            it('should free browser if run states failed', function() {
                StateRunner.prototype.run.returns(q.reject());

                return run_()
                    .fail(function() {
                        assert.calledOnce(BrowserAgent.prototype.freeBrowser);
                    });
            });
        });

        it('should add `browserId` and `sessionId` to error if something failed', function() {
            browser.sessionId = 'test-session-id';
            CaptureSession.prototype.runActions.returns(q.reject(new Error('test_error')));

            return run_()
                .fail(function(e) {
                    assert.deepEqual(e, {
                        browserId: 'default-browser',
                        sessionId: 'test-session-id'
                    });
                });
        });
    });
});
