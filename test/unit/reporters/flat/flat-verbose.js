'use strict';

const chalk = require('chalk');

const EventEmitter = require('events').EventEmitter;
const FlatVerboseReporter = require('lib/reporters/flat-factory/flat-verbose');
const RunnerEvents = require('lib/constants/runner-events');
const logger = require('lib/utils').logger;

describe('Reporter#FlatVerbose', () => {
    const sandbox = sinon.sandbox.create();
    let emitter;

    beforeEach(() => {
        const reporter = new FlatVerboseReporter();

        emitter = new EventEmitter();
        reporter.attachRunner(emitter);
        sandbox.stub(logger);
    });

    afterEach(() => {
        sandbox.restore();
        emitter.removeAllListeners();
    });

    it('should correctly do the rendering', () => {
        const test = {
            suite: {path: ['block', 'size', 'big']},
            state: {name: 'hover'},
            browserId: 'chrome',
            sessionId: '0fc23des'
        };

        emitter.emit(RunnerEvents.BEGIN);
        emitter.emit(RunnerEvents.UPDATE_RESULT, test);
        emitter.emit(RunnerEvents.END);

        const deserealizedResult = chalk
            .stripColor(logger.log.firstCall.args[0])
            .substr(2); // remove first symbol (icon)

        assert.equal(deserealizedResult, 'block size big hover [chrome: 0fc23des]');
    });
});
