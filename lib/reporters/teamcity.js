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
    runner.on('begin', function() {
        teamcityOut('testSuiteStarted', {name: 'gemini'});
    });

    runner.on('beginPlan', function(planName) {
        teamcityOut('testSuiteStarted', {name: planName});
    });

    runner.on('beginState', function(planName, stateName, browserName) {
        teamcityOut('testStarted', {
            name: stateName + '.' + browserName,
            flowId: planName + '.' + stateName + '.' + browserName
        });
    });

    runner.on('endTest', function(result) {
        if (!result.equal) {
            teamcityOut('testFailed', {
                name: result.stateName + '.' + result.browserName,
                message: 'Images does not match',
                flowId: result.planName + '.' + result.stateName + '.' + result.browserName
            });
        }
        
    });

    runner.on('endState', function(planName, stateName, browserName) {
        teamcityOut('testFinished', {
            name: stateName + '.' + browserName,
            flowId: planName + '.' + stateName + '.' + browserName
        });
    });

    runner.on('endPlan', function(planName) {
        teamcityOut('testSuiteFinished', {name: planName});
    });

    runner.on('end', function() {
        teamcityOut('testSuiteFinished', {name: 'gemini'});
    });
};
