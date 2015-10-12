'use strict';

var _ = require('lodash'),
    Config = require('../../lib/config'),
    FailCollector = require('../../lib/fail-collector');

describe('FailCollector', function() {
    var sandbox = sinon.sandbox.create(),
        candidate;

    beforeEach(function() {
        candidate = {
            browserId: 'browser',
            suite: {}
        };
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('tryToSubmitError', function() {
        it('should throw if retry candidate missing `suite` field', function() {
            var failCollector = createFailCollector_();

            assert.throws(function() {
                failCollector.tryToSubmitError({browserId: 'id'});
            }, 'suite');
        });

        it('should throw if retry candidate missing `browserId` field', function() {
            var failCollector = createFailCollector_();

            assert.throws(function() {
                failCollector.tryToSubmitError({suite: {}});
            }, 'browserId');
        });

        it('should not submit candidate if no retries set for browser', function() {
            var failCollector = createFailCollector_({browser: 0});

            assert.equal(failCollector.tryToSubmitError(candidate), false);
        });

        it('should not submit candidate if performed more retries than available for browser', function() {
            var failCollector = createFailCollector_({browser: 1});

            failCollector.retry(_.noop);

            assert.equal(failCollector.tryToSubmitError(candidate), false);
        });

        it('should return true if candidate was submitted for retry', function() {
            var failCollector = createFailCollector_();

            assert.equal(failCollector.tryToSubmitError(candidate), true);
        });

        it('should emit `retry` event if candidate was submitted for retry', function() {
            var failCollector = createFailCollector_(),
                onRetry = sandbox.spy();

            failCollector.on('retry', onRetry);
            failCollector.tryToSubmitError(candidate);

            assert.calledOnce(onRetry);
        });

        it('should extend retry candidate with info about retry', function() {
            var failCollector = createFailCollector_({browser: 1}),
                onRetry = sandbox.spy();

            failCollector.on('retry', onRetry);
            failCollector.tryToSubmitError(candidate);

            assert.calledWithMatch(onRetry, {
                attempt: 0,
                retriesLeft: 1
            });
        });

        it('should add suite to retry queue', function() {
            var failCollector = createFailCollector_(),
                suite = {
                    fullName: 'test_name'
                },
                candidate = {
                    browserId: 'browser',
                    suite: suite
                },
                retryFunc = sandbox.spy();

            failCollector.tryToSubmitError(candidate);
            failCollector.retry(retryFunc);

            assert.calledWith(retryFunc, [suite]);
        });

        it('should submit candidate with same suite for different browsers', function() {
            var suite = {
                    fullName: 'test_name'
                },
                firstCandidate = {
                    browserId: 'browser',
                    suite: suite
                },
                secondCandidate = {
                    browserId: 'anotherBrowser',
                    suite: suite,
                    equal: false
                },
                failCollector = createFailCollector_({
                    browser: 1,
                    anotherBrowser: 1
                }),
                retryFunc = sandbox.spy().named('retryFunc');

            failCollector.tryToSubmitError(firstCandidate);
            failCollector.tryToSubmitError(secondCandidate);
            failCollector.retry(retryFunc);

            assert.calledWithMatch(retryFunc, [{
                fullName: 'test_name',
                browsers: ['browser', 'anotherBrowser']
            }]);
        });
    });

    describe('tryToSubmitCapture', function() {
        it('should not submit candidate with missing `equal` property', function() {
            var failCollector = createFailCollector_();

            assert.equal(failCollector.tryToSubmitCapture(candidate), false);
        });

        it('should not submit candidate with no diff', function() {
            var failCollector = createFailCollector_(),
                candidate = {
                    browserId: 'browser',
                    suite: {},
                    equal: true
                };

            assert.equal(failCollector.tryToSubmitCapture(candidate), false);
        });

        it('should submit candidate in case of diff', function() {
            var failCollector = createFailCollector_(),
                candidate = {
                    browserId: 'browser',
                    suite: {},
                    equal: false
                };

            assert.equal(failCollector.tryToSubmitCapture(candidate), true);
        });
    });

    describe('retry', function() {
        it('should call `retry performer` function if suites for retry were added', function() {
            var failCollector = createFailCollector_(),
                retryFunc = sandbox.spy();

            failCollector.tryToSubmitError(candidate);
            failCollector.retry(retryFunc);

            assert.calledOnce(retryFunc);
        });

        it('should return result of `retry performer` function', function() {
            var failCollector = createFailCollector_(),
                retryFunc = sandbox.stub();

            failCollector.tryToSubmitError(candidate);
            retryFunc.returns('foo');

            assert.equal(failCollector.retry(retryFunc), 'foo');
        });

        it('should not call `retry performer` function if suites for retry are not added', function() {
            var failCollector = createFailCollector_(),
                retryFunc = sandbox.stub();

            failCollector.retry(retryFunc);

            assert.notCalled(retryFunc);
        });

        it('should return resolved promise if suites for retry are not added', function() {
            var failCollector = createFailCollector_();

            return assert.isFulfilled(failCollector.retry());
        });

        it('should pass suites to retry to `retry performer` function', function() {
            var failCollector = createFailCollector_(),
                suite = {
                    fullName: 'test_suite'
                },
                candidate = {
                    browserId: 'browser',
                    suite: suite
                },
                retryFunc = sandbox.stub().named('retryFunc');

            failCollector.tryToSubmitError(candidate);
            failCollector.retry(retryFunc);

            var suites = retryFunc.lastCall.args[0];

            assert.lengthOf(suites, 1);
            assert.include(suites, suite);
        });

        it('should clear previously submitted suites', function() {
            var failCollector = createFailCollector_({
                    browser: 10
                }),
                firstSuite = {
                    fullName: 'first_suite'
                },
                firstCandidate = {
                    browserId: 'browser',
                    suite: firstSuite
                },
                secondSuite = {
                    fullName: 'second_suite'
                },
                secondCandidate = {
                    browserId: 'browser',
                    suite: secondSuite
                },
                retryFunc = sandbox.stub();

            failCollector.tryToSubmitError(firstCandidate);
            failCollector.retry(_.noop);

            failCollector.tryToSubmitError(secondCandidate);
            failCollector.retry(retryFunc);

            var suitesToRetry = retryFunc.lastCall.args[0];

            assert.notInclude(suitesToRetry, firstSuite);
            assert.include(suitesToRetry, secondSuite);
        });

        it('should increase performed retries counter', function() {
            var failCollector = createFailCollector_({
                    browser: 10
                }),
                onRetry = sandbox.stub();

            failCollector.on('retry', onRetry);
            failCollector.retry(_.noop);
            failCollector.tryToSubmitError(candidate);

            assert.calledWithMatch(onRetry, {attempt: 1});
        });
    });
});

function createFailCollector_(defaults) {
    defaults = defaults || {browser: 1};

    return new FailCollector(createConfig_(defaults));
}

function createConfig_(defaults) {
    var config = sinon.createStubInstance(Config);

    _.forEach(defaults, function(retries, browserId) {
        config.forBrowser.withArgs(browserId).returns({retry: retries});
    });

    return config;
}
