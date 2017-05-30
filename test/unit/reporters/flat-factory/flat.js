'use strict';

const chalk = require('chalk');

const EventEmitter = require('events').EventEmitter;
const FlatReporter = require('lib/reporters/flat-factory/flat');
const logger = require('lib/utils').logger;
const Events = require('lib/constants/events');

describe('Reporter#Flat', () => {
    const sandbox = sinon.sandbox.create();

    let test;
    let emitter;

    const emit = (event, data) => {
        emitter.emit(Events.BEGIN);

        if (event) {
            emitter.emit(event, data);
        }

        emitter.emit(Events.END, {});
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

    describe('should print an error if it there is in', () => {
        it('result', () => {
            test.message = 'Error from result';

            emit(Events.ERROR, test);

            assert.calledWith(logger.error, test.message);
        });

        it('originalError', () => {
            test.originalError = {stack: 'Error from originalError'};

            emit(Events.ERROR, test);

            assert.calledWith(logger.error, test.originalError.stack);
        });
    });

    it('should log result from stats', () => {
        emit(Events.END, {
            total: 15,
            updated: 1,
            passed: 2,
            failed: 3,
            skipped: 4,
            retries: 5
        });

        const deserealizedResult = chalk.stripColor(logger.log.firstCall.args[0]);

        assert.equal(deserealizedResult, 'Total: 15 Updated: 1 Passed: 2 Failed: 3 Skipped: 4 Retries: 5');
    });

    it('should correctly do the rendering', () => {
        test = {
            suite: {path: ['block', 'size', 'big']},
            state: {name: 'hover'},
            browserId: 'chrome'
        };

        emit(Events.UPDATE_RESULT, test);

        const deserealizedResult = chalk
            .stripColor(logger.log.firstCall.args[0])
            .substr(2); // remove first symbol (icon)

        assert.equal(deserealizedResult, 'block size big hover [chrome]');
    });
});
