'use strict';

const _ = require('lodash');
const QEmitter = require('qemitter');

const SuiteRunner = require('lib/runner/suite-runner/suite-runner');
const DecoratorSuiteRunner = require('lib/runner/suite-runner/decorator-suite-runner');
const RunnerEvents = require('lib/constants/runner-events');
const PrivateEvents = require('lib/runner/private-events');
const Config = require('lib/config');

describe('runner/suite-runner/decorator-suite-runner', () => {
    const sandbox = sinon.sandbox.create();

    const makeDecoratorRunner = (suiteRunner, params) => {
        params = _.defaults(params || {}, {
            rootUrl: 'http://localhost/foo/default/'
        });

        const config = sinon.createStubInstance(Config);
        config.forBrowser.returns({rootUrl: params.rootUrl});

        return new DecoratorSuiteRunner(suiteRunner, {}, config);
    };

    const makeSuiteData = (params) => {
        params = _.defaults(params || {}, {
            url: '/testUrl'
        });

        return {
            suite: {
                url: params.url
            }
        };
    };

    afterEach(() => sandbox.restore());

    describe('run', () => {
        it('should call run of decorated suite runner', () => {
            const suiteRunner = sinon.createStubInstance(SuiteRunner);
            const decorator = makeDecoratorRunner(suiteRunner);

            decorator.run();

            return assert.calledOnce(suiteRunner.run);
        });
    });

    describe('cancel', () => {
        it('should call cancel of decorated suite runner', () => {
            const suiteRunner = sinon.createStubInstance(SuiteRunner);
            const decorator = makeDecoratorRunner(suiteRunner);

            decorator.cancel();

            assert.calledOnce(suiteRunner.cancel);
        });
    });

    describe('event decorator', () => {
        beforeEach(() => sandbox.spy(DecoratorSuiteRunner.prototype, 'emitAndWait'));

        [
            RunnerEvents.BEGIN_SUITE,
            RunnerEvents.END_SUITE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.SKIP_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR,
            PrivateEvents.STATE_RESULT,
            PrivateEvents.CRITICAL_ERROR
        ].forEach((event) => {
            it(`should pass ${event} event from an original to a decorated suite runner`, () => {
                const suiteRunner = new QEmitter();
                const decorator = makeDecoratorRunner(suiteRunner);

                const eventSpy = sinon.spy().named(event);
                const suiteData = makeSuiteData();
                const suiteDataClone = _.cloneDeep(suiteData);

                decorator.on(event, eventSpy);
                suiteRunner.emit(event, suiteDataClone);

                assert.calledWithMatch(eventSpy, suiteDataClone);
                assert.notDeepEqual(suiteData, suiteDataClone);
            });

            it(`should wait for resolving of all listeners when ${event} event was emitted`, () => {
                const suiteRunner = new QEmitter();
                const decorator = makeDecoratorRunner(suiteRunner);

                suiteRunner.emit(event, makeSuiteData());

                assert.calledWith(decorator.emitAndWait, event);
            });
        });
    });

    describe('add metaInfo url to suite field', () => {
        it('should concatenate rootUrl and suiteUrl', () => {
            const suiteRunner = new QEmitter();
            makeDecoratorRunner(suiteRunner, {rootUrl: 'http://localhost/foo/bar/'});

            const suiteData = makeSuiteData({url: 'testUrl'});

            suiteRunner.emit(RunnerEvents.BEGIN_SUITE, suiteData);

            assert.equal(suiteData.suite.metaInfo.url, '/foo/bar/testUrl');
        });

        it('should cut latest slashes from url', () => {
            const suiteRunner = new QEmitter();
            makeDecoratorRunner(suiteRunner, {rootUrl: 'http://localhost/foo/baz/'});

            const suiteData = makeSuiteData({url: 'testUrl//'});

            suiteRunner.emit(RunnerEvents.BEGIN_SUITE, suiteData);

            assert.equal(suiteData.suite.metaInfo.url, '/foo/baz/testUrl');
        });

        it('should remove consecutive slashes', () => {
            const suiteRunner = new QEmitter();
            makeDecoratorRunner(suiteRunner, {rootUrl: 'http://localhost/foo/qux/'});

            const suiteData = makeSuiteData({url: '/testUrl'});

            suiteRunner.emit(RunnerEvents.BEGIN_SUITE, suiteData);

            assert.equal(suiteData.suite.metaInfo.url, '/foo/qux/testUrl');
        });

        it('should remove redundant slashes between rootUrl and metaInfo.url', () => {
            const suiteRunner = new QEmitter();
            makeDecoratorRunner(suiteRunner, {rootUrl: 'http://localhost/foo/bar'});

            const suiteData = makeSuiteData({url: 'testUrl'});

            suiteRunner.emit(RunnerEvents.BEGIN_SUITE, suiteData);

            assert.equal(suiteData.suite.metaInfo.url, '/foo/bar/testUrl');
        });
    });
});
