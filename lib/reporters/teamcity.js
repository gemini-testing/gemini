'use strict';
var util = require('util');

function teamcityOut(command, args) {
    var argsStr = Object.keys(args)
        .map(function(key) {
            return util.format('%s=\'%s\'', key, args[key]);
        })
        .reduce(function(left, right) {
            return left + ' ' + right;
        });

    console.log('##teamcity[%s %s]', command, argsStr);
}

module.exports = function teamcityReporter(runner) {
    var browserSuites;


    runner.on('begin', function(data) {
        browserSuites = {};
        data.browserIds.forEach(function(browserId) {
            browserSuites[browserId] = [];
        });
        teamcityOut('testSuiteStarted', {name: 'gemini'});
    });

    runner.on('beginSuite', function(data) {
        teamcityOut('testSuiteStarted', {
            name: data.browserId + '.' + data.suiteName,
            flowId: data.browserId
        });
        browserSuites[data.browserId].push(data.suiteName);
    });

    runner.on('endSuite', function(data) {
        browserSuites[data.browserId].pop();
    });

    runner.on('beginState', function(data) {
        teamcityOut('testStarted', {
            name: data.stateName,
            flowId: data.browserId
        });
    });

    runner.on('skipState', function(data) {
        teamcityOut('testIgnored', {
            name: data.stateName,
            flowId: data.browserId
        });
    });

    runner.on('endTest', function(result) {
        if (!result.equal) {
            teamcityOut('testFailed', {
                name: result.stateName,
                message: 'Images does not match',
                flowId: result.browserId
            });
        }
        
    });

    runner.on('endState', function(data) {
        teamcityOut('testFinished', {
            name: data.stateName,
            flowId: data.browserId
        });
    });

    runner.on('endSuite', function(data) {
        teamcityOut('testSuiteFinished', {
            name: data.suiteName,
            flowId: data.browserId
        });
    });

    runner.on('end', function() {
        teamcityOut('testSuiteFinished', {name: 'gemini'});
    });
};
