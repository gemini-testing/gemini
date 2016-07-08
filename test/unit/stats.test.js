'use strict';
var EventEmitter = require('events').EventEmitter,
    inherit = require('inherit'),

    Stats = require('lib/stats'),
    RunnerEvents = require('lib/constants/runner-events');

describe('stats', function() {
    var stats;

    beforeEach(function() {
        stats = new Stats();
    });

    it('should return \'undefined\' before adding keys', function() {
        assert.isUndefined(stats.get('counter'));
    });

    it('should allow to add new key', function() {
        stats.add('counter');
        assert.equal(stats.get('counter'), 1);
    });

    it('should increment existing keys', function() {
        stats.add('counter');
        stats.add('counter');
        assert.equal(stats.get('counter'), 2);
    });

    it('should return all full stat', function() {
        stats.add('counter');
        stats.add('counter');
        stats.add('counter');
        stats.add('counter2');
        stats.add('counter3');
        stats.add('counter3');
        assert.deepEqual(stats.get(), {
            counter: 3,
            counter2: 1,
            counter3: 2
        });
    });
});

describe('stats listener', function() {
    var stats,
        Runner = inherit(EventEmitter, {}),
        runner;

    beforeEach(function() {
        runner = new Runner();
        stats = new Stats(runner);
    });

    it('should return undefined before triggering any events', function() {
        assert.isUndefined(stats.get('total'));
    });

    it('should count on beginState event', function() {
        runner.emit(RunnerEvents.BEGIN_STATE);
        assert.equal(stats.get('total'), 1);
    });

    it('should count on skipState event', function() {
        runner.emit(RunnerEvents.SKIP_STATE);
        assert.equal(stats.get('total'), 1);
        assert.equal(stats.get('skipped'), 1);
    });

    it('should count on warning event', function() {
        runner.emit(RunnerEvents.WARNING);
        assert.equal(stats.get('warned'), 1);
    });

    it('should count on error event', function() {
        runner.emit(RunnerEvents.ERROR);
        assert.equal(stats.get('errored'), 1);
    });

    it('should count on capture event', function() {
        runner.emit(RunnerEvents.CAPTURE);
        assert.equal(stats.get('gathered'), 1);
    });

    it('should count test passed', function() {
        runner.emit(RunnerEvents.END_TEST, {equal: true});
        assert.equal(stats.get('passed'), 1);
    });

    it('should count test failed', function() {
        runner.emit(RunnerEvents.END_TEST, {equal: false});
        assert.equal(stats.get('failed'), 1);
    });
});
