'use strict';

const EventEmitter = require('events').EventEmitter;
const inherit = require('inherit');

const Stats = require('lib/stats');
const Events = require('lib/constants/events');

describe('stats', () => {
    let stats;

    beforeEach(() => {
        stats = new Stats();
    });

    it('should return \'undefined\' before adding keys', () => {
        assert.isUndefined(stats.get('counter'));
    });

    it('should allow to add new key', () => {
        stats.add('counter');
        assert.equal(stats.get('counter'), 1);
    });

    it('should increment existing keys', () => {
        stats.add('counter');
        stats.add('counter');
        assert.equal(stats.get('counter'), 2);
    });

    it('should return all full stat', () => {
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

describe('stats listener', () => {
    let stats;
    let Runner = inherit(EventEmitter, {});
    let runner;

    beforeEach(() => {
        runner = new Runner();
        stats = new Stats(runner);
    });

    it('should return undefined before triggering any events', () => {
        assert.isUndefined(stats.get('total'));
    });

    it('should count on beginState event', () => {
        runner.emit(Events.BEGIN_STATE);
        assert.equal(stats.get('total'), 1);
    });

    it('should count on skipState event', () => {
        runner.emit(Events.SKIP_STATE);
        assert.equal(stats.get('total'), 1);
        assert.equal(stats.get('skipped'), 1);
    });

    it('should count on warning event', () => {
        runner.emit(Events.WARNING);
        assert.equal(stats.get('warned'), 1);
    });

    it('should count on error event', () => {
        runner.emit(Events.ERROR);
        assert.equal(stats.get('errored'), 1);
    });

    it('should count on updated images', () => {
        runner.emit(Events.UPDATE_RESULT, {updated: true});
        assert.equal(stats.get('updated'), 1);
    });

    it('should count on passed images', () => {
        runner.emit(Events.UPDATE_RESULT, {updated: false});
        assert.equal(stats.get('passed'), 1);
    });

    it('should count test passed', () => {
        runner.emit(Events.TEST_RESULT, {equal: true});
        assert.equal(stats.get('passed'), 1);
    });

    it('should count test failed', () => {
        runner.emit(Events.TEST_RESULT, {equal: false});
        assert.equal(stats.get('failed'), 1);
    });
});
