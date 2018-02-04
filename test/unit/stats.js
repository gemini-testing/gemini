'use strict';

const {EventEmitter} = require('events');
const RunnerEvents = require('../../lib/constants/events');
const Stats = require('../../lib/stats');
const {makeStateResult} = require('../util');

describe('Stats', () => {
    let stats;
    let runner;

    beforeEach(() => {
        runner = new EventEmitter();
        stats = new Stats();
        stats.attachRunner(runner);
    });

    it('should count skipped tests', () => {
        runner.emit(RunnerEvents.SKIP_STATE, makeStateResult());

        assert.equal(stats.getResult().skipped, 1);
    });

    it('should count updated tests', () => {
        runner.emit(RunnerEvents.UPDATE_RESULT, makeStateResult({updated: true}));

        assert.equal(stats.getResult().updated, 1);
    });

    it('should count passed tests on "UPDATE_RESULT" event', () => {
        runner.emit(RunnerEvents.UPDATE_RESULT, makeStateResult({updated: false}));

        assert.equal(stats.getResult().passed, 1);
    });

    it('should count failed tests on "ERROR" event', () => {
        runner.emit(RunnerEvents.ERROR, makeStateResult());

        assert.equal(stats.getResult().failed, 1);
    });

    it('should count failed tests on "TEST_RESULT" event', () => {
        runner.emit(RunnerEvents.TEST_RESULT, makeStateResult({equal: false}));

        assert.equal(stats.getResult().failed, 1);
    });

    it('should count passed tests on "TEST_RESULT" event', () => {
        runner.emit(RunnerEvents.TEST_RESULT, makeStateResult({equal: true}));

        assert.equal(stats.getResult().passed, 1);
    });

    it('should count retried tests on "RETRY" event', () => {
        runner.emit(RunnerEvents.RETRY, makeStateResult({name: 'some-test'}));
        runner.emit(RunnerEvents.TEST_RESULT, makeStateResult({equal: true, name: 'some-test'}));

        assert.equal(stats.getResult().total, 1);
        assert.equal(stats.getResult().retries, 1);
        assert.equal(stats.getResult().passed, 1);
    });

    it('should count total test count', () => {
        runner.emit(RunnerEvents.TEST_RESULT, makeStateResult({equal: false, name: 'first'}));
        runner.emit(RunnerEvents.TEST_RESULT, makeStateResult({equal: true, name: 'second'}));

        assert.equal(stats.getResult().total, 2);
    });

    it('should return correct full statistic', () => {
        runner.emit(RunnerEvents.UPDATE_RESULT, makeStateResult({updated: true, name: 'updated'}));
        runner.emit(RunnerEvents.RETRY, makeStateResult({name: 'passed'}));
        runner.emit(RunnerEvents.TEST_RESULT, makeStateResult({equal: true, name: 'passed'}));
        runner.emit(RunnerEvents.TEST_RESULT, makeStateResult({equal: false, name: 'failed'}));
        runner.emit(RunnerEvents.ERROR, makeStateResult({name: 'errored'}));
        runner.emit(RunnerEvents.SKIP_STATE, makeStateResult({name: 'skipped'}));

        assert.deepEqual(stats.getResult(), {
            total: 5,
            updated: 1,
            passed: 1,
            failed: 2,
            skipped: 1,
            retries: 1
        });
    });

    it('should handle cases when several events were emitted for the same test', () => {
        runner.emit(RunnerEvents.SKIP_STATE, makeStateResult({name: 'some-state'}));
        runner.emit(RunnerEvents.ERROR, makeStateResult({name: 'some-state'}));

        assert.equal(stats.getResult().skipped, 0);
        assert.equal(stats.getResult().failed, 1);
    });

    it('should not count test result twice for same state and browser', () => {
        const test = makeStateResult({
            browserId: 'test_browser',
            state: 'test_state'
        });

        runner.emit(RunnerEvents.ERROR, test);
        runner.emit(RunnerEvents.ERROR, test);

        assert.equal(stats.getResult().total, 1);
        assert.equal(stats.getResult().failed, 1);
    });

    it('should correctly handle tests with the similar titles', () => {
        const test1 = makeStateResult({
            suite: {fullName: 'some case'},
            browserId: 'bro'
        });
        const test2 = makeStateResult({
            suite: {fullName: 'some cas'},
            browserId: 'ebro'
        });

        runner.emit(RunnerEvents.ERROR, test1);
        runner.emit(RunnerEvents.ERROR, test2);

        assert.equal(stats.getResult().total, 2);
        assert.equal(stats.getResult().failed, 2);
    });
});
