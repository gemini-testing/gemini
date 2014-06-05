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
    var suitesStack;

    function flowId(stateName, browserId) {
        return suitesStack
            .concat([
                stateName,
                browserId
            ])
            .join('.');
    }

    runner.on('begin', function() {
        suitesStack = [];
        teamcityOut('testSuiteStarted', {name: 'gemini'});
    });

    runner.on('beginSuite', function(suiteName) {
        teamcityOut('testSuiteStarted', {name: suiteName});
        suitesStack.push(suiteName);
    });

    runner.on('endSuite', function(suiteName) {
        suitesStack.pop();
    });

    runner.on('beginState', function(suiteName, stateName, browserId) {
        teamcityOut('testStarted', {
            name: stateName + '.' + browserId,
            flowId: flowId(stateName, browserId)
        });
    });

    runner.on('skipState', function(suiteName, stateName, browserId) {
        teamcityOut('testIgnored', {
            name: stateName + '.' + browserId,
            flowId: flowId(stateName, browserId)
        });
    });

    runner.on('endTest', function(result) {
        if (!result.equal) {
            teamcityOut('testFailed', {
                name: result.stateName + '.' + result.browserId,
                message: 'Images does not match',
                flowId: flowId(result.stateName, result.browserId)
            });
        }
        
    });

    runner.on('endState', function(suiteName, stateName, browserId) {
        teamcityOut('testFinished', {
            name: stateName + '.' + browserId,
            flowId: flowId(stateName, browserId)
        });
    });

    runner.on('endSuite', function(suiteName) {
        teamcityOut('testSuiteFinished', {name: suiteName});
    });

    runner.on('end', function() {
        teamcityOut('testSuiteFinished', {name: 'gemini'});
    });
};
