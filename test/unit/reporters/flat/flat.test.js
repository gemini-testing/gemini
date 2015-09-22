'use strict';

var assert = require('chai').assert,
    sinon = require('sinon'),
    EventEmitter = require('events').EventEmitter,
    FlatReporter = require('../../../../lib/reporters/flat-factory/flat'),
    RunnerEvents = require('../../../../lib/constants/runner-events'),
    logger = require('../../../../lib/utils').logger,
    chalk = require('chalk');

describe('Reporter#Flat', function() {
    var sandbox = sinon.sandbox.create(),
        test,
        emitter;

    function getCounters(args) {
        return {
            total: chalk.stripColor(args[1]),
            passed: chalk.stripColor(args[2]),
            failed: chalk.stripColor(args[3]),
            skipped: chalk.stripColor(args[4])
        };
    }

    function emit(event, data) {
        emitter.emit(RunnerEvents.BEGIN);
        if (event) {
            emitter.emit(event, data);
        }
        emitter.emit(RunnerEvents.END);
    }

    beforeEach(function() {
        test = {
            suite: {path: []},
            state: {name: 'test'},
            browserId: 0
        };

        var reporter = new FlatReporter();

        emitter = new EventEmitter();
        reporter.attachRunner(emitter);
        sandbox.stub(logger);
    });

    afterEach(function() {
        sandbox.restore();
        emitter.removeAllListeners();
    });

    it('should initialize counters with 0', function() {
        emit();

        var counters = getCounters(logger.log.lastCall.args);

        assert.equal(counters.total, 0);
        assert.equal(counters.passed, 0);
        assert.equal(counters.failed, 0);
        assert.equal(counters.skipped, 0);
    });

    describe('should correctly calculate counters for', function() {
        it('successed', function() {
            emit(RunnerEvents.CAPTURE, test);

            var counters = getCounters(logger.log.lastCall.args);

            assert.equal(counters.total, 1);
            assert.equal(counters.passed, 1);
            assert.equal(counters.failed, 0);
            assert.equal(counters.skipped, 0);
        });

        it('failed', function() {
            emit(RunnerEvents.ERROR, test);

            var counters = getCounters(logger.log.lastCall.args);

            assert.equal(counters.total, 1);
            assert.equal(counters.passed, 0);
            assert.equal(counters.failed, 1);
            assert.equal(counters.skipped, 0);
        });

        it('skipped', function() {
            emit(RunnerEvents.WARNING, test);

            var counters = getCounters(logger.log.lastCall.args);

            assert.equal(counters.total, 1);
            assert.equal(counters.passed, 0);
            assert.equal(counters.failed, 0);
            assert.equal(counters.skipped, 1);
        });
    });

    describe('should correctly choose a handler if `equal` is', function() {
        it('true', function() {
            test.equal = true;

            emit(RunnerEvents.END_TEST, test);

            var counters = getCounters(logger.log.lastCall.args);

            assert.equal(counters.passed, 1);
            assert.equal(counters.failed, 0);
        });
        it('false', function() {
            test.equal = false;

            emit(RunnerEvents.END_TEST, test);

            var counters = getCounters(logger.log.lastCall.args);

            assert.equal(counters.passed, 0);
            assert.equal(counters.failed, 1);
        });
    });

    describe('should print an error if it there is in', function() {
        it('result', function() {
            test.message = 'Error from result';

            emit(RunnerEvents.ERROR, test);

            assert.calledWith(logger.error, test.message);
        });

        it('originalError', function() {
            test.originalError = {stack: 'Error from originalError'};

            emit(RunnerEvents.ERROR, test);

            assert.calledWith(logger.error, test.originalError.stack);
        });
    });

    it('should correctly do the rendering', function() {
        test = {
            suite: {path: ['block', 'size', 'big']},
            state: {name: 'hover'},
            browserId: 'chrome'
        };

        emit(RunnerEvents.CAPTURE, test);

        var deserealizedResult = chalk
            .stripColor(logger.log.firstCall.args[0])
            .substr(2); // remove first symbol (icon)

        assert.equal(deserealizedResult, 'block size big hover [chrome]');
    });
});
