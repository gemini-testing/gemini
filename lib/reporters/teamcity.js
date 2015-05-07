/**
 * @see {@link https://confluence.jetbrains.com/display/TCD8/Build+Script+Interaction+with+TeamCity|documentation}
 */

'use strict';
var _ = require('lodash'),
    inherit = require('inherit'),
    util = require('util'),

    RunnerEvents = require('../constants/runner-events');

function escapeMessage(message) {
    return _.isString(message)? message
        .toString()
        .replace(/\|/g, '||')
        .replace(/\'/g, '|\'')
        .replace(/\`/g, '|\'')
        .replace(/\n/g, '|n')
        .replace(/\r/g, '|r')
        .replace(/\u0085/g, '|x')
        .replace(/\u2028/g, '|l')
        .replace(/\u2029/g, '|p')
        .replace(/\[/g, '|[')
        .replace(/\]/g, '|]') : '';
}

function wrapInQuote(s) {
    return '\'' + s + '\''
}

function formatMessage(format, args) {
    var argsStr = _(args)
        .mapValues(_.compose(wrapInQuote, escapeMessage))
        .pairs()
        .map(function(pair) {
            return pair.join('=');
        })
        .join(' ');

    return util.format(format, argsStr);
}

var logger = {
        log: function(str){
            console.log(str);
        }
    },

    write = _.compose(logger.log, formatMessage),
    name = 'gemini-tests',

    TeamcityReporter = inherit({
        beginReport: _.partial(write('##teamcity[blockOpened name=\'' + name + '\']')),
        endReport:   _.partial(write, '##teamcity[blockClosed name=\'' + name + '\']'),

        startSuite:  _.partial(write, '##teamcity[testSuiteStarted %s]'),
        endSuite:    _.partial(write, '##teamcity[testSuiteFinished %s]'),

        ignoreTest:  function(message, props) {
            this._startTest(props);
            write('##teamcity[testIgnored message=\'' + escapeMessage(message) + '\' %s]', props);
            this._endTest(props);
        },


        failTest: function(details, props) {
            this._startTest(props);
            write('##teamcity[testFailed details=\'' + escapeMessage(details) + '\' %s]', props);
            this._endTest(props);
        },

        successTest: function(props) {
            this._startTest(props);
            this._endTest(props);
        },

        _startTest:   _.partial(write, '##teamcity[testStarted %s]'),
        _endTest:     _.partial(write, '##teamcity[testFinished %s]')
    });

module.exports = function(runner) {
    var teamcity = new TeamcityReporter(),
        suitesMessages = {};

    function pushMessage(result, fn) {
        var browserId = result.browserId,
            suiteFullName = browserId + '.'  + result.suite.path.join('/');

        suitesMessages[suiteFullName] = suitesMessages[suiteFullName] || [];
        suitesMessages[suiteFullName].push(fn);
    }


    runner.on(RunnerEvents.BEGIN, teamcity.beginReport);

    runner.on(RunnerEvents.BEGIN_SUITE, function(result) {
        var browserId = result.browserId,
            suiteFullName = browserId + '.'  + result.suitePath.join('/');

        pushMessage(result, function() {
            teamcity.startSuite({name: suiteFullName, flowId: browserId});
        });
    });

    runner.on(RunnerEvents.END_SUITE, function(result) {
        var browserId = result.browserId,
            suiteFullName = browserId + '.'  + result.suite.path.join('/');

        pushMessage(result, function() {
            teamcity.endSuite({name: suiteFullName, flowId: browserId});
        });

        _.each(suitesMessages[suiteFullName], function(msg) {
            msg();
        });
    });

    runner.on(RunnerEvents.SKIP_STATE, function(data) {
        pushMessage(result, function() {
            teamcity.ignoreTest('Test skipped', {
                name: data.state.name,
                flowId: data.browserId
            });
        });

    });

    runner.on(RunnerEvents.END_TEST, function(result) {
        var props = {name: result.state.name, flowId: result.browserId};

        result.equal ?
            pushMessage(result, function() {
                teamcity.successTest(props);
            }):
            pushMessage(result, function() {
                teamcity.failTest('Images does not match.', props);
            });
    });

    runner.on(RunnerEvents.ERROR, function(errorResult) {
        var props = {name: errorResult.state.name, flowId: errorResult.browserId};

        pushMessage(errorResult, function() {
            teamcity.failTest(errorResult.stack || errorResult.message || errorResult, props);
        });
    });

    runner.on(RunnerEvents.WARNING, function(errorResult) {
        var props = {name: errorResult.state.name, flowId: errorResult.browserId};

        pushMessage(errorResult, function() {
            teamcity.ignoreTest(errorResult.message, props);
        });
    });

    runner.on(RunnerEvents.END, teamcity.endReport);
};
