'use strict';
var chalk = require('chalk');

var CHECK = chalk.green('\u2713'),
    XMARK = chalk.red('\u2718');

module.exports = function(runner) {
    var browserSuites, failed, passed, skipped;

    function reportSuccess(data) {
        report(CHECK, data.stateName, data.browserId);
    }

    function reportFail(data) {
        report(XMARK, data.stateName, data.browserId);
    }

    function report(mark, stateName, browserId) {
        var fullSuiteName = browserSuites[browserId].join(' ');
        console.log('%s %s ' + chalk.underline('%s') + ' ' + chalk.yellow('[%s]'),
            mark,
            fullSuiteName,
            stateName,
            browserId
        );
    }

    runner.on('begin', function(data) {
        failed = passed = skipped = 0;
        browserSuites = {};
        data.browserIds.forEach(function(browserId) {
            browserSuites[browserId] = [];
        });
    });

    runner.on('beginSuite', function(data) {
        browserSuites[data.browserId].push(data.suiteName);
    });

    runner.on('endSuite', function(data) {
        browserSuites[data.browserId].pop();
    });

    //for test command
    runner.on('endTest', function(result) {
        if (result.equal) {
            reportSuccess(result);
            passed++;
        } else {
            reportFail(result);
            failed++;
        }
    });

    //for gather command
    runner.on('capture', function(data) {
        reportSuccess(data);
        passed++;
    });

    runner.on('error', function(error) {
        reportFail(error);

        if (error.originalError) {
            error = error.originalError;
        }
        console.error(error.stack || error.message);

        failed++;
    });

    runner.on('end', function() {
        var total = failed + passed + skipped;
        console.log('Total: %s Passed: %s Failed: %s Skipped: %s',
                    chalk.underline(total),
                    chalk.green(passed),
                    chalk.red(failed),
                    chalk.cyan(skipped));
    });
};
