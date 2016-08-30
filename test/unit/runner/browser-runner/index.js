'use strict';

const q = require('q');
const BrowserRunner = require('lib/runner/browser-runner');
const BrowserAgent = require('lib/runner/browser-runner/browser-agent');
const SuiteRunner = require('lib/runner/suite-runner/suite-runner');
const suiteRunnerFabric = require('lib/runner/suite-runner');
const CancelledError = require('lib/errors/cancelled-error');
const BasicPool = require('lib/browser-pool/basic-pool');
const Config = require('lib/config');

const makeSuiteStub = require('../../../util').makeSuiteStub;

describe('runner/BrowserRunner', () => {
    const sandbox = sinon.sandbox.create();

    let suiteRunner;

    beforeEach(() => {
        suiteRunner = sinon.createStubInstance(SuiteRunner);
        suiteRunner.run.returns(q.resolve());

        sandbox.stub(suiteRunnerFabric, 'create');
        suiteRunnerFabric.create.returns(suiteRunner);
    });

    afterEach(() => sandbox.restore());

    const mkRunner_ = (browser, browserPool) => {
        return BrowserRunner.create(
            browser || 'default-browser',
            sinon.createStubInstance(Config),
            browserPool || sinon.createStubInstance(BasicPool)
        );
    };

    describe('constructor', () => {
        it('should create browser agent associated with passed browser id', () => {
            sandbox.stub(BrowserAgent, 'create');
            const browserPool = sinon.createStubInstance(BasicPool);

            mkRunner_('browser', browserPool);

            assert.calledWith(BrowserAgent.create, 'browser', browserPool);
        });
    });

    describe('run', () => {
        it('should emit `startBrowser` event when starting browser', () => {
            const onStartBrowser = sinon.spy().named('onStartBrowser');
            const runner = mkRunner_('browser');

            runner.on('startBrowser', onStartBrowser);

            return runner.run([])
                .then(() => assert.calledWith(onStartBrowser, {browserId: 'browser'}));
        });

        it('should run only suites expected to be run in current browser', () => {
            const someSuite = makeSuiteStub({browsers: ['browser1', 'browser2']});
            const suites = [
                someSuite,
                makeSuiteStub({browsers: ['browser2']})
            ];
            const runner = mkRunner_('browser1');

            return runner.run(suites)
                .then(() => {
                    assert.calledOnce(suiteRunnerFabric.create);
                    assert.calledWith(suiteRunnerFabric.create, someSuite);
                });
        });

        it('should pass to suite runner browser agent associated with current browser', () => {
            const browserAgent = new BrowserAgent('browser');
            const suites = [makeSuiteStub({browsers: ['browser']})];

            sandbox.stub(BrowserAgent, 'create');
            BrowserAgent.create.returns(browserAgent);

            const runner = mkRunner_('browser');

            return runner.run(suites)
                .then(() => assert.calledWith(suiteRunnerFabric.create, sinon.match.any, browserAgent));
        });

        it('should passthrough stateProcessor to suite runner', () => {
            const suites = [makeSuiteStub({browsers: ['browser']})];
            const runner = mkRunner_('browser');

            return runner.run(suites, 'stateProcessor')
                .then(() => assert.calledWith(suiteRunner.run, 'stateProcessor'));
        });

        it('should not run suites after cancel', () => {
            const runner = mkRunner_('browser');
            const suites = [{browsers: ['browser']}];

            runner.cancel();

            return runner.run(suites)
                .then(() => assert.notCalled(suiteRunner.run));
        });

        it('should cancel suite runners on cancel', () => {
            const runner = mkRunner_('browser');
            const suites = [
                makeSuiteStub({browsers: ['browser']}),
                makeSuiteStub({browsers: ['browser']})
            ];

            return runner.run(suites)
                .then(() => {
                    runner.cancel();

                    assert.calledTwice(suiteRunner.cancel);
                });
        });

        it('should emit `stopBrowser` after all suites', () => {
            const onStopBrowser = sinon.spy().named('onStopBrowser');
            const runner = mkRunner_('browser');

            runner.on('startBrowser', onStopBrowser);

            return runner.run([])
                .then(() => assert.calledWith(onStopBrowser, {browserId: 'browser'}));
        });

        it('should emit events in correct order', () => {
            const startBrowser = sinon.spy().named('onStartBrowser');
            const stopBrowser = sinon.spy().named('onStopBrowser');
            const suites = [makeSuiteStub({browsers: ['browser']})];
            const runner = mkRunner_('browser');

            runner.on('startBrowser', startBrowser);
            runner.on('stopBrowser', stopBrowser);

            return runner.run(suites)
                .then(() => {
                    assert.callOrder(
                        startBrowser,
                        suiteRunner.run,
                        stopBrowser
                    );
                });
        });
    });

    describe('critical error', () => {
        it('should emit `criticalError` event on error', () => {
            const onCriticalError = sinon.spy().named('onCriticalError');
            const suites = [makeSuiteStub({browsers: ['browser']})];
            const runner = mkRunner_('browser');

            runner.on('criticalError', onCriticalError);
            suiteRunner.run.onFirstCall().returns(q.reject(new Error('error')));

            return runner.run(suites)
                .then(() => assert.calledOnce(onCriticalError));
        });

        it('should not emit `criticalError` if it was manually stopped', () => {
            const onCriticalError = sinon.spy().named('onCriticalError');
            const suites = [makeSuiteStub()];
            const runner = mkRunner_();

            runner.on('criticalError', onCriticalError);
            suiteRunner.run.onFirstCall().returns(q.reject(new CancelledError()));

            return runner.run(suites)
                .then(() => assert.notCalled(onCriticalError));
        });

        it('should pass suite and browser id as critical error event data', () => {
            const onCriticalError = sinon.spy().named('onCriticalError');
            const suite = makeSuiteStub({browsers: ['browser']});
            const suites = [suite];
            const runner = mkRunner_('browser');

            runner.on('criticalError', onCriticalError);
            suiteRunner.run.onFirstCall().returns(q.reject(new Error('error')));

            return runner.run(suites)
                .then(() => {
                    const err = onCriticalError.firstCall.args[0];

                    assert.equal(suite, err.suite);
                    assert.equal('browser', err.browserId);
                });
        });
    });
});
