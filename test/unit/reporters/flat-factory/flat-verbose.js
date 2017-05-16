'use strict';

const chalk = require('chalk');

const EventEmitter = require('events').EventEmitter;
const FlatVerboseReporter = require('lib/reporters/flat-factory/flat-verbose');
const Events = require('lib/constants/events');
const logger = require('lib/utils').logger;

describe('Reporter#FlatVerbose', () => {
    const sandbox = sinon.sandbox.create();
    let emitter;

    function getTestLog(test) {
        emitter.emit(Events.BEGIN);
        emitter.emit(Events.UPDATE_RESULT, test);
        emitter.emit(Events.END, {});

        return chalk
            .stripColor(logger.log.firstCall.args[0])
            .substr(2); // remove first symbol (icon)
    }

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

        assert.equal(getTestLog(test), 'block size big hover [chrome: 0fc23des]');
    });

    it('should not render session identifier for skipped tests', () => {
        const test = {
            suite: {path: ['some-path'], skipped: {}},
            state: {name: 'some-name'},
            browserId: 'chrome'
        };

        assert.equal(getTestLog(test), 'some-path some-name [chrome]');
    });
});
