'use strict';

const TestCounter = require('lib/test-counter');

const stubTest = (opts) => {
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
            const completed = stubTest({state: 'defaultState'});

            counter.onRetry(completed);

            assert.equal(counter.getResult().retries, 1);
        });
    });

    describe('getResult', () => {
        it('should return object with collected results', () => {
            const result = counter.getResult();

            ['updated', 'passed', 'failed', 'skipped', 'retries', 'total'].forEach((key) => {
                assert.property(result, key);
            });
        });

        it('should calculate total from `updated`, `passed`, `failed`, `errored`, `skipped` and `warned`', () => {
            const updated = stubTest({state: 'updated'});
            const passed = stubTest({state: 'passed'});
            const failed = stubTest({state: 'failed'});
            const errored = stubTest({state: 'errored'});
            const skipped = stubTest({state: 'skipped'});
            const warned = stubTest({state: 'warned'});

            counter.onUpdated(updated);
            counter.onPassed(passed);
            counter.onFailed(failed);
            counter.onErrored(errored);
            counter.onSkipped(skipped);
            counter.onWarned(warned);

            assert.equal(counter.getResult().total, 6);
        });

        it('should not add retries to total', () => {
            const passed = stubTest({state: 'some_state'});
            const retried = stubTest({
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
    it('should count test result', () => {
        const completed = stubTest({state: 'defaultState'});
        const counter = new TestCounter();

        counter['on' + name](completed);

        assert.equal(counter.getResult()[name.toLowerCase()], 1);
    });

    it('should not count test result twice for same suite and browser', () => {
        const counter = new TestCounter();
        const completed = stubTest({
            browserId: 'test_browser',
            state: 'test_state'
        });

        counter['on' + name](completed);
        counter['on' + name](completed);

        assert.equal(counter.getResult()[name.toLowerCase()], 1);
    });
}
