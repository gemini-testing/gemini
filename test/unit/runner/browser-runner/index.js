'use strict';
var q = require('q'),
    BrowserRunner = require('../../../../lib/runner/browser-runner'),
    BrowserAgent = require('../../../../lib/runner/browser-runner/browser-agent'),
    SuiteRunner = require('../../../../lib/runner/suite-runner/suite-runner'),
    suiteRunnerFabric = require('../../../../lib/runner/suite-runner'),
    pool = require('../../../../lib/browser-pool'),
    BasicPool = require('../../../../lib/browser-pool/basic-pool'),
    Config = require('../../../../lib/config'),

    makeSuiteStub = require('../../../util').makeSuiteStub;

describe('runner/BrowserRunner', function() {
    var sandbox = sinon.sandbox.create(),
        suiteRunner;

    beforeEach(function() {
        suiteRunner = sinon.createStubInstance(SuiteRunner);
        suiteRunner.run.returns(q.resolve());

        sandbox.stub(suiteRunnerFabric, 'create');
        suiteRunnerFabric.create.returns(suiteRunner);

        sandbox.stub(BrowserAgent.prototype);
    });

    afterEach(function() {
        sandbox.restore();
    });

    function mkRunner_(browser, browserPool) {
        return BrowserRunner.create(
            browser || 'default-browser',
            sinon.createStubInstance(Config),
            browserPool || sinon.createStubInstance(BasicPool)
        );
    }

    describe('constructor', function() {
        it('should create browser agent associated with passed browser id', function() {
            var browserPool = sinon.createStubInstance(BasicPool);

            mkRunner_('browser', browserPool);

            assert.calledWith(BrowserAgent.prototype.__constructor, 'browser', browserPool);
        });
    });

    describe('run', function() {
        it('should emit `startBrowser` event when starting browser', function() {
            var onStartBrowser = sinon.spy().named('onStartBrowser'),
                runner = mkRunner_('browser');
            runner.on('startBrowser', onStartBrowser);

            return runner.run([])
                .then(function() {
                    assert.calledWith(onStartBrowser, {browserId: 'browser'});
                });
        });

        it('should run only suites expected to be run in current browser', function() {
            var someSuite = makeSuiteStub({browsers: ['browser1', 'browser2']}),
                suites = [
                    someSuite,
                    makeSuiteStub({browsers: ['browser2']})
                ];

            var runner = mkRunner_('browser1');

            return runner.run(suites)
                .then(function() {
                    assert.calledOnce(suiteRunnerFabric.create);
                    assert.calledWith(suiteRunnerFabric.create, someSuite);
                });
        });

        it('should pass to suite runner browser agent associated with current browser', function() {
            var browserAgent = new BrowserAgent('browser'),
                suites = [makeSuiteStub({browsers: ['browser']})];

            sandbox.stub(BrowserAgent, 'create');
            BrowserAgent.create.returns(browserAgent);

            var runner = mkRunner_('browser');

            return runner.run(suites)
                .then(function() {
                    assert.calledWith(suiteRunnerFabric.create, sinon.match.any, browserAgent);
                });
        });

        it('should passthrough stateProcessor to suite runner', function() {
            var suites = [makeSuiteStub({browsers: ['browser']})],
                runner = mkRunner_('browser');

            return runner.run(suites, 'stateProcessor')
                .then(function() {
                    assert.calledWith(suiteRunner.run, 'stateProcessor');
                });
        });

        it('should not run suites after cancel', function() {
            var runner = mkRunner_('browser'),
                suites = [
                    {browsers: ['browser']}
                ];
            runner.cancel();

            return runner.run(suites)
                .then(function() {
                    assert.notCalled(suiteRunner.run);
                });
        });

        it('should cancel suite runners on cancel', function() {
            var runner = mkRunner_('browser'),
                suites = [
                    makeSuiteStub({browsers: ['browser']}),
                    makeSuiteStub({browsers: ['browser']})
                ];

            return runner.run(suites)
                .then(function() {
                    runner.cancel();

                    assert.calledTwice(suiteRunner.cancel);
                });
        });

        it('should emit `stopBrowser` after all suites', function() {
            var onStopBrowser = sinon.spy().named('onStopBrowser'),
                runner = mkRunner_('browser');
            runner.on('startBrowser', onStopBrowser);

            return runner.run([])
                .then(function() {
                    assert.calledWith(onStopBrowser, {browserId: 'browser'});
                });
        });

        it('should emit events in correct order', function() {
            var startBrowser = sinon.spy().named('onStartBrowser'),
                stopBrowser = sinon.spy().named('onStopBrowser'),
                suites = [
                    makeSuiteStub({browsers: ['browser']})
                ];

            var runner = mkRunner_('browser');
            runner.on('startBrowser', startBrowser);
            runner.on('stopBrowser', stopBrowser);

            return runner.run(suites)
                .then(function() {
                    assert.callOrder(
                        startBrowser,
                        suiteRunner.run,
                        stopBrowser
                    );
                });
        });
    });

    describe('critical error', function() {
        it('should emit `criticalError` event on error', function() {
            var onCriticalError = sinon.spy().named('onCriticalError'),
                suites = [
                    makeSuiteStub({browsers: ['browser']})
                ];

            var runner = mkRunner_('browser');
            runner.on('criticalError', onCriticalError);
            suiteRunner.run.onFirstCall().returns(q.reject(new Error('error')));

            return runner.run(suites)
                .then(function() {
                    assert.calledOnce(onCriticalError);
                });
        });

        it('should not emit `criticalError` if it was manually stopped', function() {
            var onCriticalError = sinon.spy().named('onCriticalError'),
                suites = [
                    makeSuiteStub()
                ],
                runner = mkRunner_();

            runner.on('criticalError', onCriticalError);
            suiteRunner.run.onFirstCall().returns(q.reject(new pool.CancelledError()));

            return runner.run(suites)
                .then(function() {
                    assert.notCalled(onCriticalError);
                });
        });

        it('should pass suite and browser id as critical error event data', function() {
            var onCriticalError = sinon.spy().named('onCriticalError'),
                suite = makeSuiteStub({browsers: ['browser']}),
                suites = [
                    suite
                ],
                runner = mkRunner_('browser');

            runner.on('criticalError', onCriticalError);
            suiteRunner.run.onFirstCall().returns(q.reject(new Error('error')));

            return runner.run(suites)
                .then(function() {
                    var err = onCriticalError.firstCall.args[0];
                    assert.equal(suite, err.suite);
                    assert.equal('browser', err.browserId);
                });
        });
    });
});
