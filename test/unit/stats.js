'use strict';

const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const RunnerEvents = require('../../lib/constants/events');
const Stats = require('../../lib/stats');

describe('Stats', () => {
    let stats;
    let runner;

    const stubTest = (opts) => {
        opts = _.defaults(opts || {}, {name: 'default-name'});

        return {
            state: {fullName: 'full-' + opts.name, name: opts.name},
            suite: {fullName: 'full-default-suite-name', name: 'default-suite-name'},
            updated: opts.updated,
            equal: opts.equal
        };
    };

    beforeEach(() => {
        runner = new EventEmitter();
        stats = new Stats(runner);
    });

    it('should count skipped tests', () => {
        runner.emit(RunnerEvents.SKIP_STATE, stubTest());

        assert.equal(stats.get('skipped'), 1);
    });

    it('should count warned tests', () => {
        runner.emit(RunnerEvents.WARNING, stubTest());

        assert.equal(stats.get('warned'), 1);
    });

    it('should count errored tests', () => {
        runner.emit(RunnerEvents.ERROR, stubTest());

        assert.equal(stats.get('errored'), 1);
    });

    it('should count updated tests', () => {
        runner.emit(RunnerEvents.UPDATE_RESULT, stubTest({updated: true}));

        assert.equal(stats.get('updated'), 1);
    });

    it('should count passed tests on "UPDATE_RESULT" event', () => {
        runner.emit(RunnerEvents.UPDATE_RESULT, stubTest({updated: false}));

        assert.equal(stats.get('passed'), 1);
    });

    it('should count failed tests on "TEST_RESULT" event', () => {
        runner.emit(RunnerEvents.TEST_RESULT, stubTest({equal: false}));

        assert.equal(stats.get('failed'), 1);
    });

    it('should count passed tests on "TEST_RESULT" event', () => {
        runner.emit(RunnerEvents.TEST_RESULT, stubTest({equal: true}));

        assert.equal(stats.get('passed'), 1);
    });

    it('should count retried tests on "RETRY" event', () => {
        runner.emit(RunnerEvents.RETRY, stubTest({name: 'some-test'}));
        runner.emit(RunnerEvents.TEST_RESULT, stubTest({equal: true, name: 'some-test'}));

        assert.equal(stats.get('total'), 1);
        assert.equal(stats.get('retries'), 1);
        assert.equal(stats.get('passed'), 1);
    });

    it('should count warned tests on "WARNING" event', () => {
        runner.emit(RunnerEvents.WARNING, stubTest());

        assert.equal(stats.get('warned'), 1);
    });

    it('should count total test count', () => {
        runner.emit(RunnerEvents.TEST_RESULT, stubTest({equal: false, name: 'first'}));
        runner.emit(RunnerEvents.TEST_RESULT, stubTest({equal: true, name: 'second'}));

        assert.equal(stats.get('total'), 2);
    });

    it('should get full stat', () => {
        runner.emit(RunnerEvents.UPDATE_RESULT, stubTest({updated: true, name: 'updated'}));
        runner.emit(RunnerEvents.RETRY, stubTest({name: 'passed'}));
        runner.emit(RunnerEvents.TEST_RESULT, stubTest({equal: true, name: 'passed'}));
        runner.emit(RunnerEvents.TEST_RESULT, stubTest({equal: false, name: 'failed'}));
        runner.emit(RunnerEvents.ERROR, stubTest({name: 'errored'}));
        runner.emit(RunnerEvents.SKIP_STATE, stubTest({name: 'skipped'}));
        runner.emit(RunnerEvents.WARNING, stubTest({name: 'warned'}));

        assert.deepEqual(stats.get(), {
            total: 6,
            updated: 1,
            passed: 1,
            failed: 1,
            errored: 1,
            skipped: 1,
            warned: 1,
            retries: 1
        });
    });

    it('should handle cases when several events were emitted for the same test', () => {
        runner.emit(RunnerEvents.SKIP_STATE, stubTest({name: 'some-state'}));
        runner.emit(RunnerEvents.ERROR, stubTest({name: 'some-state'}));

        assert.equal(stats.get('skipped'), 0);
        assert.equal(stats.get('errored'), 1);
    });
});
