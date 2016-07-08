'use strict';

var TestCounter = require('lib/reporters/utils/test-counter');

describe('TestCounter', function() {
    var counter;

    beforeEach(function() {
        counter = new TestCounter();
    });

    describe('onPassed', function() {
        testCounter_('Passed');
    });

    describe('onFailed', function() {
        testCounter_('Failed');
    });

    describe('onSkipped', function() {
        testCounter_('Skipped');
    });

    describe('onRetry', function() {
        it('should increase `retries` count', function() {
            var completed = mkCompleted_({state: 'defaultState'});

            counter.onRetry(completed);

            assert.equal(counter.getResult().retries, 1);
        });

        it('should clear stats for retried suite', function() {
            var completed = mkCompleted_({state: 'defaultState'});

            counter.onPassed(completed);
            counter.onRetry(completed);

            assert.equal(counter.getResult().passed, 0);
        });
    });

    describe('getResult', function() {
        it('should return object with collected results', function() {
            var result = counter.getResult();

            ['passed', 'failed', 'skipped', 'retries', 'total'].forEach(function(key) {
                assert.property(result, key);
            });
        });

        it('should calculate total from `passed`, `failed` and `skipped`', function() {
            var passed = mkCompleted_({state: 'passed'}),
                failed = mkCompleted_({state: 'failed'}),
                skipped = mkCompleted_({state: 'skipped'});

            counter.onPassed(passed);
            counter.onFailed(failed);
            counter.onSkipped(skipped);

            assert.equal(counter.getResult().total, 3);
        });

        it('should not add retries to total', function() {
            var passed = mkCompleted_({state: 'some_state'}),
                retried = mkCompleted_({
                    state: 'some_other_state',
                    browserId: 'some_browser'
                });

            counter.onPassed(passed);
            counter.onRetry(retried);

            assert.equal(counter.getResult().total, 1);
        });
    });
});

function testCounter_(name) {
    it('should count test result if it has state', function() {
        var completed = mkCompleted_({state: 'defaultState'}),
            counter = new TestCounter();

        counter['on' + name](completed);

        assert.equal(counter.getResult()[name.toLowerCase()], 1);
    });

    it('should count test result if it does not have state', function() {
        var completed = mkCompleted_({state: undefined}),
            counter = new TestCounter();

        counter['on' + name](completed);

        assert.equal(counter.getResult()[name.toLowerCase()], 1);
    });

    it('should not count test result if it does not have state or suite', function() {
        var completed = {browserId: 'some_browser'},
            counter = new TestCounter();

        counter['on' + name](completed);

        assert.equal(counter.getResult()[name.toLowerCase()], 0);
    });

    it('should not count test result twice for same suite and browser', function() {
        var counter = new TestCounter(),
            completed = mkCompleted_({
                browserId: 'test_browser',
                state: 'test_state'
            });

        counter['on' + name](completed);
        counter['on' + name](completed);

        assert.equal(counter.getResult()[name.toLowerCase()], 1);
    });
}

function mkCompleted_(opts) {
    opts = opts || {};

    return {
        suite: {fullName: 'default_suite'},
        browserId: opts.browserId || 'default_browser',
        state: opts.state && {name: opts.state}
    };
}
