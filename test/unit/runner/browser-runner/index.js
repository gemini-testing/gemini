'use strict';

const Promise = require('bluebird');
const BrowserRunner = require('lib/runner/browser-runner');
const BrowserAgent = require('lib/runner/browser-runner/browser-agent');
const SuiteRunner = require('lib/runner/suite-runner/suite-runner');
const suiteRunnerFabric = require('lib/runner/suite-runner');
const BasicPool = require('lib/browser-pool/basic-pool');
const Config = require('lib/config');
const SuiteCollection = require('lib/suite-collection');

const makeSuiteStub = require('../../../util').makeSuiteStub;

describe('runner/BrowserRunner', () => {
    const sandbox = sinon.sandbox.create();

    let suiteRunner;

    beforeEach(() => {
        suiteRunner = sinon.createStubInstance(SuiteRunner);
        suiteRunner.run.returns(Promise.resolve());

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

    describe('run', () => {
        let suiteCollection;

        beforeEach(() => {
            suiteCollection = {
                clone: () => suiteCollection,
                allSuites: () => []
            };
        });

        it('should run only suites expected to be run in current browser', () => {
            const someSuite = makeSuiteStub({browsers: ['browser1', 'browser2']});
            const suiteCollection = new SuiteCollection([
                someSuite,
                makeSuiteStub({browsers: ['browser2']})
            ]);
            const runner = mkRunner_('browser1');

            return runner.run(suiteCollection)
                .then(() => {
                    assert.calledOnce(suiteRunnerFabric.create);
                    assert.calledWith(suiteRunnerFabric.create, someSuite);
                });
        });

        it('should pass to suite runner browser agent associated with current browser', () => {
            const browserAgent = new BrowserAgent('browser');
            const suiteCollection = new SuiteCollection([makeSuiteStub({browsers: ['browser']})]);

            sandbox.stub(BrowserAgent, 'create');
            BrowserAgent.create.returns(browserAgent);

            const runner = mkRunner_('browser');

            return runner.run(suiteCollection)
                .then(() => assert.calledWith(suiteRunnerFabric.create, sinon.match.any, browserAgent));
        });

        it('should create browser agent instance for each suite', () => {
            const suiteCollection = new SuiteCollection([
                makeSuiteStub({browsers: ['bro']}),
                makeSuiteStub({browsers: ['bro']})
            ]);
            sandbox.spy(BrowserAgent, 'create');

            return mkRunner_('bro')
                .run(suiteCollection)
                .then(() => {
                    assert.calledTwice(BrowserAgent.create);
                    assert.notEqual(
                        suiteRunnerFabric.create.firstCall.args[1],
                        suiteRunnerFabric.create.secondCall.args[1]
                    );
                });
        });

        it('should passthrough stateProcessor to suite runner', () => {
            const suiteCollection = new SuiteCollection([makeSuiteStub({browsers: ['browser']})]);
            const runner = mkRunner_('browser');

            return runner.run(suiteCollection, 'stateProcessor')
                .then(() => assert.calledWith(suiteRunner.run, 'stateProcessor'));
        });

        it('should cancel suite runners on cancel', () => {
            const runner = mkRunner_('browser');
            const suiteCollection = new SuiteCollection([
                makeSuiteStub({browsers: ['browser']}),
                makeSuiteStub({browsers: ['browser']})
            ]);

            return runner.run(suiteCollection)
                .then(() => {
                    runner.cancel();

                    assert.calledTwice(suiteRunner.cancel);
                });
        });
    });
});
