'use strict';

const proxyquire = require('proxyquire');
const suiteUtil = require('lib/suite-util');
const util = require('../../../util');

describe('runner/suite-runner/create', () => {
    const sandbox = sinon.sandbox.create();

    let StatelessRunner;
    let SkippedRunner;
    let InsistentRunner;

    let SuiteRunnerFactory;

    const makeStatelessSuite = () => util.makeSuiteStub();
    const makeSuite = () => util.makeSuiteStub({states: [util.makeStateStub()]});

    const makeSuiteRunner = (suite) => {
        return SuiteRunnerFactory.create(suite, {}, {});
    };

    beforeEach(() => {
        StatelessRunner = sandbox.stub();
        SkippedRunner = sandbox.stub();
        InsistentRunner = sandbox.stub();

        SuiteRunnerFactory = proxyquire('lib/runner/suite-runner', {
            './stateless-suite-runner': StatelessRunner,
            './skipped-suite-runner': SkippedRunner,
            './insistent-suite-runner': InsistentRunner
        });
    });

    afterEach(() => sandbox.restore());

    describe('StatelessSuiteRunner', () => {
        it('should create StatelessSuiteRunner', () => {
            makeSuiteRunner(makeStatelessSuite());

            assert.calledOnce(StatelessRunner);
            assert.notCalled(SkippedRunner);
            assert.notCalled(InsistentRunner);
        });

        it('should return StatelessSuiteRunner for suite without states', () => {
            const runner = makeSuiteRunner(makeStatelessSuite(), {}, {});

            assert.instanceOf(runner, StatelessRunner);
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
            assert.notCalled(InsistentRunner);
        });

        it('should return SkippedSuiteRunner for skipped suite', () => {
            const runner = makeSuiteRunner(makeSuite(), {});

            assert.instanceOf(runner, SkippedRunner);
        });
    });

    describe('InsistentSuiteRunner', () => {
        it('should create InsistentSuiteRunner', () => {
            makeSuiteRunner(makeSuite());

            assert.calledOnce(InsistentRunner);
            assert.notCalled(StatelessRunner);
            assert.notCalled(SkippedRunner);
        });

        it('should return InsistentSuiteRunner for other suites', () => {
            const runner = makeSuiteRunner(makeSuite());

            assert.instanceOf(runner, InsistentRunner);
        });
    });
});
