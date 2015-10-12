'use strict';
var q = require('q'),
    CaptureSession = require('../../../lib/capture-session'),
    SuiteRunner = require('../../../lib/runner/suite-runner'),
    StateRunner = require('../../../lib/runner/state-runner'),
    Config = require('../../../lib/config'),
    util = require('../../util'),

    makeSuiteStub = require('../../util').makeSuiteStub;

describe('runner/SuiteRunner', function() {
    var sandbox = sinon.sandbox.create(),
        browser,
        config;

    beforeEach(function() {
        sandbox.stub(StateRunner.prototype);
        sandbox.stub(CaptureSession.prototype);
        browser = util.browserWithId('default-browser');
        config = sinon.createStubInstance(Config);

        StateRunner.prototype.run.returns(q.resolve());
        CaptureSession.prototype.runHook.returns(q.resolve());

        sandbox.stub(browser, 'openRelative');
        browser.openRelative.returns(q.resolve());
    });

    afterEach(function() {
        sandbox.restore();
    });

    function mkRunner_() {
        return SuiteRunner.create(browser, config);
    }

    function run_(suite) {
        var runner = mkRunner_();
        return runner.run(suite);
    }

    describe('run', function() {
        it('should emit `beginSuite` event', function() {
            var onBeginSuite = sinon.spy().named('onBeginSuite'),
                suite = makeSuiteStub(),
                runner = SuiteRunner.create(browser, config);
            browser.id = 'browser';

            runner.on('beginSuite', onBeginSuite);
            return runner.run(suite)
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
                runner = SuiteRunner.create(browser, config);
            browser.id = 'browser';

            runner.on('endSuite', onEndSuite);
            return runner.run(suite)
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
                suite = makeSuiteStub(),
                runner = mkRunner_();

            runner.on('beginSuite', onBeginSuite);
            runner.on('endSuite', onEndSuite);

            return runner.run(suite)
                .then(function() {
                    assert.callOrder(
                        onBeginSuite,
                        onEndSuite
                    );
                });
        });

        it('should not call any hook if no states', function() {
            var suite = makeSuiteStub();

            return run_(suite)
                .then(function() {
                    assert.notCalled(CaptureSession.prototype.runHook);
                });
        });

        it('should call `before` hook if there are some states', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

            return run_(suite)
                .then(function() {
                    assert.calledWith(CaptureSession.prototype.runHook, suite.beforeHook, suite);
                });
        });

        it('should run states', function() {
            var state = util.makeStateStub(),
                suite = makeSuiteStub({
                    states: [state]
                });

            return run_(suite)
                .then(function() {
                    assert.calledWith(StateRunner.prototype.run, state);
                });
        });

        describe('if `beforeHook` failed', function() {
            var suite;

            beforeEach(function() {
                suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

                CaptureSession.prototype.runHook.withArgs(suite.beforeHook).returns(q.reject());
            });

            it('should fail', function() {
                CaptureSession.prototype.runHook.withArgs(suite.beforeHook).returns(q.reject('some-error'));

                return assert.isRejected(run_(suite), /some-error/);
            });

            it('should not run states', function() {
                return run_(suite)
                    .fail(function() {
                        assert.notCalled(StateRunner.prototype.run);
                    });
            });

            it('should not run `afterHook`', function() {
                return run_(suite)
                    .fail(function() {
                        assert.neverCalledWith(CaptureSession.prototype.runHook, suite.afterHook);
                    });
            });

            it('should not run post actions', function() {
                return run_(suite)
                    .fail(function() {
                        assert.notCalled(suite.runPostActions);
                    });
            });
        });

        it('should run next state only after previous has been finished', function() {
            var state1 = util.makeStateStub(),
                state2 = util.makeStateStub(),
                mediator = sinon.spy(),
                suite = makeSuiteStub({
                    states: [state1, state2]
                });

            StateRunner.prototype.run.withArgs(state1).returns(q.delay(1).then(mediator));

            return run_(suite)
                .then(function() {
                    assert.callOrder(
                        StateRunner.prototype.run.withArgs(state1).named('state1 runner'),
                        mediator.named('middle function'),
                        StateRunner.prototype.run.withArgs(state2).named('state2 runner')
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

        it('should not run states after cancel', function() {
            var state = util.makeStateStub(),
                suite = makeSuiteStub({
                    states: [state]
                }),
                runner = mkRunner_();

            runner.cancel();

            return runner.run(suite)
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

        it('should call `after` hook', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

            return run_(suite)
                .then(function() {
                    assert.calledWith(CaptureSession.prototype.runHook, suite.afterHook, suite);
                });
        });

        it('should run `afterHook` even if state failed', function() {
            var state = util.makeStateStub(),
                suite = makeSuiteStub({
                    states: [state]
                });

            StateRunner.prototype.run.returns(q.reject());

            return run_(suite)
                .fail(function() {
                    assert.calledWith(CaptureSession.prototype.runHook, suite.afterHook, suite);
                });
        });

        it('should fail if `afterHook` failed', function() {
            var state = util.makeStateStub(),
                suite = makeSuiteStub({
                    states: [state]
                });

            CaptureSession.prototype.runHook.withArgs(suite.afterHook).returns(q.reject('some-error'));

            return assert.isRejected(run_(suite), /some-error/);
        });

        it('should reject with state error if state and `afterHook` failed', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

            StateRunner.prototype.run.returns(q.reject('state-error'));
            CaptureSession.prototype.runHook.withArgs(suite.afterHook).returns(q.reject('hook-error'));

            return assert.isRejected(run_(suite), /state-error/);
        });

        it('should run post actions', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

            return run_(suite)
                .then(function() {
                    assert.calledOnce(suite.runPostActions);
                });
        });

        it('should fail if post actions failed', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

            suite.runPostActions.returns(q.reject('some-error'));

            return assert.isRejected(run_(suite), /some-error/);
        });

        it('should run post actions if state failed', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

            StateRunner.prototype.run.returns(q.reject());

            return run_(suite)
                .fail(function() {
                    assert.calledOnce(suite.runPostActions);
                });
        });

        it('should run post actions if `afterHook` failed', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

            CaptureSession.prototype.runHook.withArgs(suite.afterHook).returns(q.reject());

            return run_(suite)
                .fail(function() {
                    assert.calledOnce(suite.runPostActions);
                });
        });

        it('should reject with state error if state and post actions failed', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

            StateRunner.prototype.run.returns(q.reject('state-error'));
            suite.runPostActions.returns(q.reject('post-actions-error'));

            return assert.isRejected(run_(suite), /state-error/);
        });

        it('should reject with afterHook error if afterHook and post actions failed', function() {
            var suite = makeSuiteStub({
                    states: [util.makeStateStub()]
                });

            CaptureSession.prototype.runHook.withArgs(suite.afterHook).returns(q.reject('after-hook-error'));
            suite.runPostActions.returns(q.reject('post-actions-error'));

            return assert.isRejected(run_(suite), /after-hook-error/);
        });
    });
});
