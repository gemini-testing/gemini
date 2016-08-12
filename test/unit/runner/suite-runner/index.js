'use strict';

const proxyquire = require('proxyquire');

const DecoratorSuiteRunner = require('lib/runner/suite-runner/decorator-suite-runner');
const Config = require('lib/config');
const suiteUtil = require('lib/suite-util');
const util = require('../../../util');

describe('runner/suite-runner/create', () => {
    const sandbox = sinon.sandbox.create();

    let StatelessRunner;
    let SkippedRunner;
    let RegularRunner;

    let SuiteRunnerFactory;

    const makeStatelessSuite = () => util.makeSuiteStub();
    const makeSuite = () => util.makeSuiteStub({states: [util.makeStateStub()]});

    const makeSuiteRunner = (suite) => {
        const config = sinon.createStubInstance(Config);
        config.forBrowser.returns({rootUrl: 'http://localhost/foo/default'});

        return SuiteRunnerFactory.create(suite, {}, config);
    };

    beforeEach(() => {
        const runnerStub = {on: () => {}};

        StatelessRunner = sandbox.stub().returns(runnerStub);
        SkippedRunner = sandbox.stub().returns(runnerStub);
        RegularRunner = sandbox.stub().returns(runnerStub);

        SuiteRunnerFactory = proxyquire('lib/runner/suite-runner', {
            './stateless-suite-runner': StatelessRunner,
            './skipped-suite-runner': SkippedRunner,
            './regular-suite-runner': RegularRunner
        });
    });

    afterEach(() => sandbox.restore());

    describe('StatelessSuiteRunner', () => {
        it('should create StatelessSuiteRunner', () => {
            makeSuiteRunner(makeStatelessSuite());

            assert.calledOnce(StatelessRunner);
            assert.notCalled(SkippedRunner);
            assert.notCalled(RegularRunner);
        });

        it('should return DecoratorSuiteRunner for StatelessSuiteRunner', () => {
            const runner = makeSuiteRunner(makeStatelessSuite());

            assert.instanceOf(runner, DecoratorSuiteRunner);
        });
    });

    describe('SkippedSuiteRunner', () => {
        beforeEach(() => {
            sandbox.stub(suiteUtil, 'shouldSkip').returns(true);
        });

        it('should create SkippedSuiteRunner', () => {
            makeSuiteRunner(makeSuite());

            assert.calledOnce(SkippedRunner);
            assert.notCalled(StatelessRunner);
            assert.notCalled(RegularRunner);
        });

        it('should return DecoratorSuiteRunner for SkippedSuiteRunner', () => {
            const runner = makeSuiteRunner(makeSuite());

            assert.instanceOf(runner, DecoratorSuiteRunner);
        });
    });

    describe('RegularSuiteRunner', () => {
        it('should create RegularSuiteRunner', () => {
            makeSuiteRunner(makeSuite());

            assert.calledOnce(RegularRunner);
            assert.notCalled(StatelessRunner);
            assert.notCalled(SkippedRunner);
        });

        it('should return DecoratorSuiteRunner for RegularSuiteRunner', () => {
            const runner = makeSuiteRunner(makeSuite());

            assert.instanceOf(runner, DecoratorSuiteRunner);
        });
    });
});
