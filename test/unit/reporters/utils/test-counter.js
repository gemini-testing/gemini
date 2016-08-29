'use strict';

const TestCounter = require('lib/reporters/utils/test-counter');

const mkCompleted_ = (opts) => {
    opts = opts || {};

    return {
        suite: {fullName: 'default_suite'},
        browserId: opts.browserId || 'default_browser',
        state: opts.state && {name: opts.state}
    };
};

describe('TestCounter', () => {
    let counter;

    beforeEach(() => {
        counter = new TestCounter();
    });

    describe('onUpdated', () => {
        testCounter_('Updated');
    });

    describe('onPassed', () => {
        testCounter_('Passed');
    });

    describe('onFailed', () => {
        testCounter_('Failed');
    });

    describe('onSkipped', () => {
        testCounter_('Skipped');
    });

    describe('onRetry', () => {
        it('should increase `retries` count', () => {
            const completed = mkCompleted_({state: 'defaultState'});

            counter.onRetry(completed);

            assert.equal(counter.getResult().retries, 1);
        });

        it('should clear stats for retried suite', () => {
            const completed = mkCompleted_({state: 'defaultState'});

            counter.onPassed(completed);
            counter.onRetry(completed);

            assert.equal(counter.getResult().passed, 0);
        });
    });

    describe('getResult', () => {
        it('should return object with collected results', () => {
            const result = counter.getResult();

            ['updated', 'passed', 'failed', 'skipped', 'retries', 'total'].forEach((key) => {
                assert.property(result, key);
            });
        });

        it('should calculate total from `updated`, `passed`, `failed` and `skipped`', () => {
            const updated = mkCompleted_({state: 'updated'});
            const passed = mkCompleted_({state: 'passed'});
            const failed = mkCompleted_({state: 'failed'});
            const skipped = mkCompleted_({state: 'skipped'});

            counter.onUpdated(updated);
            counter.onPassed(passed);
            counter.onFailed(failed);
            counter.onSkipped(skipped);

            assert.equal(counter.getResult().total, 4);
        });

        it('should not add retries to total', () => {
            const passed = mkCompleted_({state: 'some_state'});
            const retried = mkCompleted_({
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
    it('should count test result if it has state', () => {
        const completed = mkCompleted_({state: 'defaultState'});
        const counter = new TestCounter();

        counter['on' + name](completed);

        assert.equal(counter.getResult()[name.toLowerCase()], 1);
    });

    it('should count test result if it does not have state', () => {
        const completed = mkCompleted_({state: undefined});
        const counter = new TestCounter();

        counter['on' + name](completed);

        assert.equal(counter.getResult()[name.toLowerCase()], 1);
    });

    it('should not count test result if it does not have state or suite', () => {
        const completed = {browserId: 'some_browser'};
        const counter = new TestCounter();

        counter['on' + name](completed);

        assert.equal(counter.getResult()[name.toLowerCase()], 0);
    });

    it('should not count test result twice for same suite and browser', () => {
        const counter = new TestCounter();
        const completed = mkCompleted_({
            browserId: 'test_browser',
            state: 'test_state'
        });

        counter['on' + name](completed);
        counter['on' + name](completed);

        assert.equal(counter.getResult()[name.toLowerCase()], 1);
    });
}


