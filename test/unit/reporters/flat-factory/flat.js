'use strict';

const chalk = require('chalk');
const _ = require('lodash');

const EventEmitter = require('events').EventEmitter;
const FlatReporter = require('lib/reporters/flat-factory/flat');
const logger = require('lib/utils').logger;
const RunnerEvents = require('lib/constants/runner-events');

describe('Reporter#Flat', () => {
    const sandbox = sinon.sandbox.create();

    let test;
    let emitter;

    const getLoggedCounters = () => {
        const str = logger.log.lastCall.args[0];
        const chunks = chalk.stripColor(str).match(/([a-z]+):\s?([0-9]+)/ig);

        return _(chunks)
            .map((val) => val.toLowerCase().split(/:\s/))
            .fromPairs()
            .value();
    };

    const emit = (event, data) => {
        emitter.emit(RunnerEvents.BEGIN);

        if (event) {
            emitter.emit(event, data);
        }

        emitter.emit(RunnerEvents.END);
    };

    beforeEach(() => {
        test = {
            suite: {path: []},
            state: {name: 'test'},
            browserId: 0,
            retriesLeft: 1
        };

        const reporter = new FlatReporter();

        emitter = new EventEmitter();
        reporter.attachRunner(emitter);
        sandbox.stub(logger);
    });

    afterEach(() => {
        sandbox.restore();
        emitter.removeAllListeners();
    });

    it('should initialize all counters with 0 except updated', () => {
        emit();

        const counters = getLoggedCounters();

        ['total', 'passed', 'failed', 'skipped', 'retries'].forEach((type) => assert.equal(counters[type], 0));
    });

    it('should not initialize update counter', () => {
        emit();

        const counters = getLoggedCounters();

        assert.isUndefined(counters.updated);
    });

    describe('should correctly calculate counters for', () => {
        describe('updated', () => {
            it('should increment "total" and "updated" counters', () => {
                test.updated = true;

                emit(RunnerEvents.UPDATE_RESULT, test);

                const counters = getLoggedCounters();

                assert.equal(counters.total, 1);
                assert.equal(counters.updated, 1);
            });

            it('should initialize all remaining counters with 0', () => {
                test.updated = true;

                emit(RunnerEvents.UPDATE_RESULT, test);

                const counters = getLoggedCounters();

                assert.equal(counters.passed, 0);
                assert.equal(counters.failed, 0);
                assert.equal(counters.skipped, 0);
                assert.equal(counters.retries, 0);
            });
        });

        it('failed', () => {
            emit(RunnerEvents.ERROR, test);

            const counters = getLoggedCounters();

            assert.equal(counters.total, 1);
            assert.equal(counters.passed, 0);
            assert.equal(counters.failed, 1);
            assert.equal(counters.skipped, 0);
        });

        describe('skipped', () => {
            it('should increment skipped count on WARNING event', () => {
                emit(RunnerEvents.WARNING, test);

                const counters = getLoggedCounters();

                assert.equal(counters.total, 1);
                assert.equal(counters.skipped, 1);
            });

            it('should increment skipped count on SKIP_STATE event', () => {
                emit(RunnerEvents.SKIP_STATE, test);

                const counters = getLoggedCounters();

                assert.equal(counters.total, 1);
                assert.equal(counters.skipped, 1);
            });
        });

        it('retry', () => {
            emit(RunnerEvents.RETRY, test);

            const counters = getLoggedCounters();

            assert.equal(counters.retries, 1);
        });
    });

    describe('should correctly choose a handler if `equal` is', () => {
        it('true', () => {
            test.equal = true;

            emit(RunnerEvents.TEST_RESULT, test);

            const counters = getLoggedCounters();

            assert.equal(counters.passed, 1);
            assert.equal(counters.failed, 0);
        });

        it('false', () => {
            test.equal = false;

            emit(RunnerEvents.TEST_RESULT, test);

            const counters = getLoggedCounters();

            assert.equal(counters.passed, 0);
            assert.equal(counters.failed, 1);
        });
    });

    describe('should correctly choose a handler if `updated` is', () => {
        it('true', () => {
            test.updated = true;

            emit(RunnerEvents.UPDATE_RESULT, test);

            const counters = getLoggedCounters();

            assert.equal(counters.updated, 1);
            assert.equal(counters.passed, 0);
        });

        it('false', () => {
            test.updated = false;

            emit(RunnerEvents.UPDATE_RESULT, test);

            const counters = getLoggedCounters();

            assert.equal(counters.passed, 1);
            assert.isUndefined(counters.updated);
        });
    });

    describe('should print an error if it there is in', () => {
        it('result', () => {
            test.message = 'Error from result';

            emit(RunnerEvents.ERROR, test);

            assert.calledWith(logger.error, test.message);
        });

        it('originalError', () => {
            test.originalError = {stack: 'Error from originalError'};

            emit(RunnerEvents.ERROR, test);

            assert.calledWith(logger.error, test.originalError.stack);
        });
    });

    it('should correctly do the rendering', () => {
        test = {
            suite: {path: ['block', 'size', 'big']},
            state: {name: 'hover'},
            browserId: 'chrome'
        };

        emit(RunnerEvents.UPDATE_RESULT, test);

        const deserealizedResult = chalk
            .stripColor(logger.log.firstCall.args[0])
            .substr(2); // remove first symbol (icon)

        assert.equal(deserealizedResult, 'block size big hover [chrome]');
    });
});
