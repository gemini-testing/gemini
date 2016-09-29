'use strict';

const _ = require('lodash');
const QEmitter = require('qemitter');

const SuiteRunner = require('lib/runner/suite-runner/suite-runner');
const DecoratorSuiteRunner = require('lib/runner/suite-runner/decorator-suite-runner');
const Events = require('lib/constants/events');
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

    describe('pass events through', () => {
        beforeEach(() => sandbox.spy(DecoratorSuiteRunner.prototype, 'emit'));

        [Events.BEGIN_SUITE, Events.END_SUITE].forEach((event) => {
            it(`should pass ${event} event through without changing`, () => {
                const suiteRunner = new QEmitter();
                const decorator = makeDecoratorRunner(suiteRunner);

                const eventSpy = sinon.spy().named(event);
                const suiteData = makeSuiteData();
                const suiteDataClone = _.cloneDeep(suiteData);

                decorator.on(event, eventSpy);
                suiteRunner.emit(event, suiteData);

                assert.deepEqual(eventSpy.firstCall.args[0], suiteDataClone);
            });

            it(`should emit ${event} event`, () => {
                const suiteRunner = new QEmitter();
                const decorator = makeDecoratorRunner(suiteRunner);

                suiteRunner.emit(event, makeSuiteData());

                assert.calledWith(decorator.emit, event);
            });
        });
    });

    describe('event decorator', () => {
        beforeEach(() => sandbox.spy(DecoratorSuiteRunner.prototype, 'emitAndWait'));

        [
            Events.BEGIN_STATE,
            Events.SKIP_STATE,
            Events.END_STATE,
            Events.TEST_RESULT,
            Events.CAPTURE,
            Events.UPDATE_RESULT,
            Events.WARNING,
            Events.ERROR,
            Events.RETRY
        ].forEach((event) => {
            it(`should pass ${event} event from an original to a decorated suite runner`, () => {
                const suiteRunner = new QEmitter();
                const decorator = makeDecoratorRunner(suiteRunner);

                const eventSpy = sinon.spy().named(event);
                const suiteData = makeSuiteData();
                const suiteDataClone = _.cloneDeep(suiteData);

                decorator.on(event, eventSpy);
                suiteRunner.emit(event, suiteData);

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
        it('should not modify a data suite multiple times', () => {
            const suiteRunner = new QEmitter();
            makeDecoratorRunner(suiteRunner, {rootUrl: 'http://localhost/foo/bar/'});

            const suiteData = makeSuiteData({url: 'testUrl'});
            suiteData.suite.metaInfo = {url: 'testUrl'};

            suiteRunner.emit(Events.BEGIN_STATE, suiteData);

            assert.equal(suiteData.suite.metaInfo.url, 'testUrl');
        });

        it('should concatenate rootUrl and suiteUrl', () => {
            const suiteRunner = new QEmitter();
            makeDecoratorRunner(suiteRunner, {rootUrl: 'http://localhost/foo/bar/'});

            const suiteData = makeSuiteData({url: 'testUrl'});

            suiteRunner.emit(Events.BEGIN_STATE, suiteData);

            assert.equal(suiteData.suite.metaInfo.url, '/foo/bar/testUrl');
        });

        it('should cut latest slashes from url', () => {
            const suiteRunner = new QEmitter();
            makeDecoratorRunner(suiteRunner, {rootUrl: 'http://localhost/foo/baz/'});

            const suiteData = makeSuiteData({url: 'testUrl//'});

            suiteRunner.emit(Events.BEGIN_STATE, suiteData);

            assert.equal(suiteData.suite.metaInfo.url, '/foo/baz/testUrl');
        });

        it('should remove consecutive slashes', () => {
            const suiteRunner = new QEmitter();
            makeDecoratorRunner(suiteRunner, {rootUrl: 'http://localhost/foo/qux/'});

            const suiteData = makeSuiteData({url: '/testUrl'});

            suiteRunner.emit(Events.BEGIN_STATE, suiteData);

            assert.equal(suiteData.suite.metaInfo.url, '/foo/qux/testUrl');
        });

        it('should remove redundant slashes between rootUrl and metaInfo.url', () => {
            const suiteRunner = new QEmitter();
            makeDecoratorRunner(suiteRunner, {rootUrl: 'http://localhost/foo/bar'});

            const suiteData = makeSuiteData({url: 'testUrl'});

            suiteRunner.emit(Events.BEGIN_STATE, suiteData);

            assert.equal(suiteData.suite.metaInfo.url, '/foo/bar/testUrl');
        });
    });
});
