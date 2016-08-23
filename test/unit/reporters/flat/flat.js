'use strict';

const EventEmitter = require('events').EventEmitter;
const FlatReporter = require('lib/reporters/flat-factory/flat');
const RunnerEvents = require('lib/constants/runner-events');
const logger = require('lib/utils').logger;
const chalk = require('chalk');

describe('Reporter#Flat', () => {
    const sandbox = sinon.sandbox.create();

    let test;
    let emitter;

    const getCounters = (args) => ({
        total: chalk.stripColor(args[1]),
        passed: chalk.stripColor(args[2]),
        failed: chalk.stripColor(args[3]),
        skipped: chalk.stripColor(args[4]),
        retries: chalk.stripColor(args[5])
    });

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

    it('should initialize counters with 0', () => {
        emit();

        const counters = getCounters(logger.log.lastCall.args);

        assert.equal(counters.total, 0);
        assert.equal(counters.passed, 0);
        assert.equal(counters.failed, 0);
        assert.equal(counters.skipped, 0);
        assert.equal(counters.retries, 0);
    });

    describe('should correctly calculate counters for', () => {
        it('successed', () => {
            emit(RunnerEvents.UPDATE_RESULT, test);

            const counters = getCounters(logger.log.lastCall.args);

            assert.equal(counters.total, 1);
            assert.equal(counters.passed, 1);
            assert.equal(counters.failed, 0);
            assert.equal(counters.skipped, 0);
        });

        it('failed', () => {
            emit(RunnerEvents.ERROR, test);

            const counters = getCounters(logger.log.lastCall.args);

            assert.equal(counters.total, 1);
            assert.equal(counters.passed, 0);
            assert.equal(counters.failed, 1);
            assert.equal(counters.skipped, 0);
        });

        describe('skipped', () => {
            it('should increment skipped count on WARNING event', () => {
                emit(RunnerEvents.WARNING, test);

                const counters = getCounters(logger.log.lastCall.args);

                assert.equal(counters.total, 1);
                assert.equal(counters.skipped, 1);
            });

            it('should increment skipped count on SKIP_STATE event', () => {
                emit(RunnerEvents.SKIP_STATE, test);

                const counters = getCounters(logger.log.lastCall.args);

                assert.equal(counters.total, 1);
                assert.equal(counters.skipped, 1);
            });
        });

        it('retry', () => {
            emit(RunnerEvents.RETRY, test);

            const counters = getCounters(logger.log.lastCall.args);

            assert.equal(counters.retries, 1);
        });
    });

    describe('should correctly choose a handler if `equal` is', () => {
        it('true', () => {
            test.equal = true;

            emit(RunnerEvents.END_TEST, test);

            const counters = getCounters(logger.log.lastCall.args);

            assert.equal(counters.passed, 1);
            assert.equal(counters.failed, 0);
        });
        it('false', () => {
            test.equal = false;

            emit(RunnerEvents.END_TEST, test);

            const counters = getCounters(logger.log.lastCall.args);

            assert.equal(counters.passed, 0);
            assert.equal(counters.failed, 1);
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
