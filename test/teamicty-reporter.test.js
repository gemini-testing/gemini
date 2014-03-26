'use strict';
var sinon = require('sinon'),
    EventEmitter = require('events').EventEmitter,
    teamictyReporter = require('../lib/reporters/teamcity');

describe('TeamCity reporter', function() {
    beforeEach(function() {
        sinon.stub(process.stdout, 'write');
        this.emitter = new EventEmitter();
        teamictyReporter(this.emitter);
    });

    afterEach(function() {
        process.stdout.write.restore();
    });

    it('should report tests start as a suite start', function() {
        this.emitter.emit('begin');
        sinon.assert.calledWith(process.stdout.write, '##teamcity[testSuiteStarted name=\'gemini\']\n');
    });

    it('should report each plan start as a suite start', function() {
        this.emitter.emit('beginPlan', 'somePlan');
        sinon.assert.calledWith(process.stdout.write, '##teamcity[testSuiteStarted name=\'somePlan\']\n');
    });

    it('should report state start as test start', function() {
        this.emitter.emit('beginState', 'somePlan', 'someState', 'browser');
        sinon.assert.calledWith(process.stdout.write,
            '##teamcity[testStarted name=\'someState.browser\' flowId=\'somePlan.someState.browser\']\n');
    });

    it('should report test fail', function() {
        this.emitter.emit('endTest', {
            planName: 'somePlan',
            stateName: 'someState',
            browserName: 'browser',
            equal: false
        });

        sinon.assert.calledWith(process.stdout.write,
            '##teamcity[testFailed name=\'someState.browser\' message=\'Images does not match\' flowId=\'somePlan.someState.browser\']\n');
    });

    it('should not report fail if test succeeded', function() {
        this.emitter.emit('endTest', {
            planName: 'somePlan',
            stateName: 'someState',
            browserName: 'browser',
            equal: true
        });
        sinon.assert.notCalled(process.stdout.write);
    });

    it('should report state end as test end', function() {
        this.emitter.emit('endState', 'somePlan', 'someState', 'browser');
        sinon.assert.calledWith(process.stdout.write,
            '##teamcity[testFinished name=\'someState.browser\' flowId=\'somePlan.someState.browser\']\n');
    });

    it('should report plan end as a suite end', function() {
        this.emitter.emit('endPlan', 'somePlan');
        sinon.assert.calledWith(process.stdout.write, '##teamcity[testSuiteFinished name=\'somePlan\']\n');
    });

    it('should report tests end as a suite end', function() {
        this.emitter.emit('end');
        sinon.assert.calledWith(process.stdout.write, '##teamcity[testSuiteFinished name=\'gemini\']\n');
    });

});
