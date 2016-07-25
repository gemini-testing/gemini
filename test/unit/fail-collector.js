'use strict';

const _ = require('lodash');
const q = require('q');
const Config = require('lib/config');
const FailCollector = require('lib/fail-collector');
const NoRefImageError = require('lib/errors/no-ref-image-error');

describe('FailCollector', () => {
    const sandbox = sinon.sandbox.create();
    let candidate;
    let suiteCollection;

    const createConfig_ = (defaults) => {
        const config = sinon.createStubInstance(Config);

        _.forEach(defaults, function(retries, browserId) {
            config.forBrowser.withArgs(browserId).returns({retry: retries});
        });

        return config;
    };

    const createFailCollector_ = (defaults) => {
        defaults = defaults || {browser: 1};

        return new FailCollector(createConfig_(defaults));
    };

    beforeEach(() => {
        suiteCollection = {
            disableAll: sinon.stub(),
            enable: sinon.stub()
        };
        candidate = {
            browserId: 'browser',
            suite: {},
            state: {}
        };
    });

    afterEach(() => sandbox.restore());

    describe('tryToSubmitError', () => {
        it('should throw if retry candidate missing `suite` field', () => {
            const failCollector = createFailCollector_();

            assert.throws(() => {
                failCollector.tryToSubmitError({browserId: 'id'});
            }, 'suite');
        });

        it('should throw if retry candidate missing `state` field', () => {
            const failCollector = createFailCollector_();

            assert.throws(() => {
                failCollector.tryToSubmitError({suite: {}, browserId: 'id'});
            }, 'state');
        });

        it('should throw if retry candidate missing `browserId` field', () => {
            const failCollector = createFailCollector_();

            assert.throws(() => {
                failCollector.tryToSubmitError({suite: {}, state: {}});
            }, 'browserId');
        });

        it('should not submit NoRefImageError', () => {
            const candidate = sinon.createStubInstance(NoRefImageError);
            const failCollector = createFailCollector_();

            assert.equal(failCollector.tryToSubmitError(candidate), false);
        });

        it('should not submit candidate if no retries set for browser', () => {
            const failCollector = createFailCollector_({browser: 0});

            assert.equal(failCollector.tryToSubmitError(candidate), false);
        });

        it('should not submit candidate if performed more retries than available for browser', () => {
            const failCollector = createFailCollector_({browser: 1});

            failCollector.tryToSubmitError(candidate);
            return failCollector
                .retry(q, suiteCollection)
                .then(() => assert.equal(failCollector.tryToSubmitError(candidate), false));
        });

        it('should return true if candidate was submitted for retry', () => {
            const failCollector = createFailCollector_();

            assert.equal(failCollector.tryToSubmitError(candidate), true);
        });

        it('should emit `retry` event if candidate was submitted for retry', () => {
            const failCollector = createFailCollector_();
            const onRetry = sandbox.spy();

            failCollector.on('retry', onRetry);
            failCollector.tryToSubmitError(candidate);

            assert.calledOnce(onRetry);
        });

        it('should extend retry candidate with info about retry', () => {
            const failCollector = createFailCollector_({browser: 1});
            const onRetry = sandbox.spy();

            failCollector.on('retry', onRetry);
            failCollector.tryToSubmitError(candidate);

            assert.calledWithMatch(onRetry, {
                attempt: 0,
                retriesLeft: 1
            });
        });

        it('should add state to retry queue', () => {
            const failCollector = createFailCollector_();
            const candidate = {
                suite: {fullName: 'suiteFullName'},
                state: {name: 'stateName'},
                browserId: 'browser'
            };

            failCollector.tryToSubmitError(candidate);

            return failCollector
                .retry(q, suiteCollection)
                .then(() => {
                    assert.calledWith(
                        suiteCollection.enable,
                        'suiteFullName',
                        {state: 'stateName', browser: 'browser'}
                    );
                });
        });
    });

    describe('tryToSubmitStateResult', () => {
        it('should not submit candidate with missing `equal` property', () => {
            const failCollector = createFailCollector_();

            assert.equal(failCollector.tryToSubmitStateResult(candidate), false);
        });

        it('should not submit candidate with no diff', () => {
            const failCollector = createFailCollector_();
            const candidate = {
                browserId: 'browser',
                suite: {},
                equal: true
            };

            assert.equal(failCollector.tryToSubmitStateResult(candidate), false);
        });

        it('should submit candidate in case of diff', () => {
            const failCollector = createFailCollector_();
            const candidate = {
                browserId: 'browser',
                suite: {},
                state: {},
                equal: false
            };

            assert.equal(failCollector.tryToSubmitStateResult(candidate), true);
        });
    });

    describe('retry', () => {
        it('should call `retry performer` function if states for retry were added', () => {
            const failCollector = createFailCollector_();
            const retryFunc = sandbox.stub().returns(q());

            failCollector.tryToSubmitError(candidate);
            return failCollector
                .retry(retryFunc, suiteCollection)
                .then(() => assert.calledOnce(retryFunc));
        });

        it('should return result of `retry performer` function', () => {
            const failCollector = createFailCollector_();
            const retryFunc = sandbox.stub();

            failCollector.tryToSubmitError(candidate);
            retryFunc.returns(q('foo'));

            return failCollector
                .retry(retryFunc, suiteCollection)
                .then((result) => assert.equal(result, 'foo'));
        });

        it('should not call `retry performer` function if states for retry are not added', () => {
            const failCollector = createFailCollector_();
            const retryFunc = sandbox.stub();

            return failCollector
                .retry(retryFunc, suiteCollection)
                .then(() => assert.notCalled(retryFunc));
        });

        it('should clear previously submitted states', () => {
            const failCollector = createFailCollector_({browser: 10});
            const firstCandidate = {
                browserId: 'browser',
                suite: {fullName: 'first_suite'},
                state: {name: 'stateName'}
            };
            const secondCandidate = {
                browserId: 'browser',
                suite: {fullName: 'second_suite'},
                state: {name: 'stateName'}
            };

            failCollector.tryToSubmitError(firstCandidate);
            return failCollector
                .retry(q, suiteCollection)
                .then(() => failCollector.tryToSubmitError(secondCandidate))
                .then(() => {
                    return failCollector
                        .retry(q, suiteCollection)
                        .then(() => {
                            assert.calledWith(suiteCollection.enable.firstCall, 'first_suite');
                            assert.calledWith(suiteCollection.enable.secondCall, 'second_suite');
                            assert.notInclude(suiteCollection.enable.secondCall.args, 'first_suite');
                        });
                });
        });

        it('should increase performed retries counter', () => {
            const failCollector = createFailCollector_({
                browser: 10
            });
            const onRetry = sandbox.stub();

            failCollector.on('retry', onRetry);
            failCollector.tryToSubmitError(candidate);
            return failCollector
                .retry(q, suiteCollection)
                .then(() => failCollector.tryToSubmitError(candidate))
                .then(() => assert.calledWithMatch(onRetry, {attempt: 1}));
        });
    });
});
