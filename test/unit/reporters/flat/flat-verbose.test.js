'use strict';

var EventEmitter = require('events').EventEmitter,
    FlatVerboseReporter = require('../../../../lib/reporters/flat-factory/flat-verbose'),
    RunnerEvents = require('../../../../lib/constants/runner-events'),
    logger = require('../../../../lib/utils').logger,
    chalk = require('chalk');

describe('Reporter#FlatVerbose', function() {
    var sandbox = sinon.sandbox.create(),
        emitter;

    beforeEach(function() {
        var reporter = new FlatVerboseReporter();

        emitter = new EventEmitter();
        reporter.attachRunner(emitter);
        sandbox.stub(logger);
    });

    afterEach(function() {
        sandbox.restore();
        emitter.removeAllListeners();
    });

    it('should correctly do the rendering', function() {
        var test = {
            suite: {path: ['block', 'size', 'big']},
            state: {name: 'hover'},
            browserId: 'chrome',
            sessionId: '0fc23des'
        };

        emitter.emit(RunnerEvents.BEGIN);
        emitter.emit(RunnerEvents.CAPTURE, test);
        emitter.emit(RunnerEvents.END);

        var deserealizedResult = chalk
            .stripColor(logger.log.firstCall.args[0])
            .substr(2); // remove first symbol (icon)

        assert.equal(deserealizedResult, 'block size big hover [chrome: 0fc23des]');
    });
});
