'use strict';
var sinon = require('sinon'),
    EventEmitter = require('events').EventEmitter,
    teamictyReporter = require('../lib/reporters/teamcity');

describe('TeamCity reporter', function() {

    var beginData = {browserIds: ['browser']},
        suiteData = {suiteName: 'someSuite', browserId: 'browser'},
        stateData = {suiteName: 'someSuite', stateName: 'someState', browserId: 'browser'};

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
        this.emitter.emit('begin', beginData);
        assertLastWrite('##teamcity[testSuiteStarted name=\'gemini\']\n');
    });

    it('should report each suite start', function() {
        this.emitter.emit('begin', beginData);
        this.emitter.emit('beginSuite', suiteData);
        assertLastWrite('##teamcity[testSuiteStarted name=\'browser.someSuite\' flowId=\'browser\']\n');
    });

    it('should report ignored state as ignored test', function() {
        this.emitter.emit('begin', beginData);
        this.emitter.emit('beginSuite', suiteData);
        this.emitter.emit('skipState', stateData);
        assertLastWrite(
            '##teamcity[testIgnored name=\'someState\' flowId=\'browser\']\n');
    });

    it('should report state start as test start', function() {
        this.emitter.emit('begin', beginData);
        this.emitter.emit('beginSuite', suiteData);
        this.emitter.emit('beginState', stateData);

        assertLastWrite(
            '##teamcity[testStarted name=\'someState\' flowId=\'browser\']\n');
    });

    it('should report test fail', function() {
        this.emitter.emit('begin', beginData);
        this.emitter.emit('beginSuite', suiteData);
        this.emitter.emit('beginState', stateData);

        this.emitter.emit('endTest', {
            suiteName: 'someSuite',
            stateName: 'someState',
            browserId: 'browser',
            equal: false
        });

        assertLastWrite(
            '##teamcity[testFailed name=\'someState\' message=\'Images does not match\' flowId=\'browser\']\n');
    });

    it('should not report fail if test succeeded', function() {
        this.emitter.emit('begin', beginData);
        this.emitter.emit('beginSuite', suiteData);
        this.emitter.emit('beginState', stateData);
        this.emitter.emit('endTest', {
            suiteName: 'someSuite',
            stateName: 'someState',
            browserId: 'browser',
            equal: true
        });

        process.stdout.write.callCount.must.be(3);
    });

    it('should report state end as test end', function() {
        this.emitter.emit('begin', beginData);
        this.emitter.emit('beginSuite', suiteData);
        this.emitter.emit('endState', stateData);

        assertLastWrite(
            '##teamcity[testFinished name=\'someState\' flowId=\'browser\']\n');
    });


    it('should report suite end', function() {
        this.emitter.emit('begin', beginData);
        this.emitter.emit('beginSuite', suiteData);
        this.emitter.emit('endSuite', suiteData);
        assertLastWrite('##teamcity[testSuiteFinished name=\'someSuite\' flowId=\'browser\']\n');
    });

    it('should report tests end as a suite end', function() {
        this.emitter.emit('end');
        assertLastWrite('##teamcity[testSuiteFinished name=\'gemini\']\n');
    });

});
