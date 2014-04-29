'use strict';
var sinon = require('sinon'),
    EventEmitter = require('events').EventEmitter,
    teamictyReporter = require('../lib/reporters/teamcity');

describe('TeamCity reporter', function() {

    function assertLastWrite(string) {
        process.stdout.write.lastCall.args[0].must.be(string);
    }

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
        assertLastWrite('##teamcity[testSuiteStarted name=\'gemini\']\n');
    });

    it('should report each suite start', function() {
        this.emitter.emit('begin');
        this.emitter.emit('beginSuite', 'someSuite');
        assertLastWrite('##teamcity[testSuiteStarted name=\'someSuite\']\n');
    });

    it('should report ignored state as ignored test', function() {
        this.emitter.emit('begin');
        this.emitter.emit('beginSuite', 'someSuite');
        this.emitter.emit('skipState', 'someSuite', 'someState', 'browser');
        assertLastWrite(
            '##teamcity[testIgnored name=\'someState.browser\' flowId=\'someSuite.someState.browser\']\n');
    });

    it('should report state start as test start', function() {
        this.emitter.emit('begin');
        this.emitter.emit('beginSuite', 'someSuite');
        this.emitter.emit('beginState', 'someSuite', 'someState', 'browser');

        assertLastWrite(
            '##teamcity[testStarted name=\'someState.browser\' flowId=\'someSuite.someState.browser\']\n');
    });

    it('should report test fail', function() {
        this.emitter.emit('begin');
        this.emitter.emit('beginSuite', 'someSuite');
        this.emitter.emit('beginState', 'someSuite', 'someState', 'browser');

        this.emitter.emit('endTest', {
            suiteName: 'someSuite',
            stateName: 'someState',
            browserName: 'browser',
            equal: false
        });

        assertLastWrite(
            '##teamcity[testFailed name=\'someState.browser\' message=\'Images does not match\' flowId=\'someSuite.someState.browser\']\n');
    });

    it('should not report fail if test succeeded', function() {
        this.emitter.emit('begin');
        this.emitter.emit('beginSuite', 'someSuite');
        this.emitter.emit('beginState', 'someSuite', 'someState', 'browser');
        this.emitter.emit('endTest', {
            suiteName: 'someSuite',
            stateName: 'someState',
            browserName: 'browser',
            equal: true
        });

        process.stdout.write.callCount.must.be(3);
    });

    it('should report state end as test end', function() {
        this.emitter.emit('begin');
        this.emitter.emit('beginSuite', 'someSuite');
        this.emitter.emit('endState', 'someSuite', 'someState', 'browser');

        assertLastWrite(
            '##teamcity[testFinished name=\'someState.browser\' flowId=\'someSuite.someState.browser\']\n');
    });

    it('should combine all nested suites to get flowId for ', function() {
        this.emitter.emit('begin');
        this.emitter.emit('beginSuite', 'first');
        this.emitter.emit('beginSuite', 'second');
        this.emitter.emit('beginState', 'second', 'someState', 'browser');

        assertLastWrite(
            '##teamcity[testStarted name=\'someState.browser\' flowId=\'first.second.someState.browser\']\n'
        );
    });

    it('should report suite end', function() {
        this.emitter.emit('begin');
        this.emitter.emit('beginSuite', 'someSuite');
        this.emitter.emit('endSuite', 'someSuite');
        assertLastWrite('##teamcity[testSuiteFinished name=\'someSuite\']\n');
    });

    it('should report tests end as a suite end', function() {
        this.emitter.emit('end');
        assertLastWrite('##teamcity[testSuiteFinished name=\'gemini\']\n');
    });

});
