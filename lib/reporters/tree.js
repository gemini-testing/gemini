'use strict';

var chalk = require('chalk');

var CHECK = chalk.green('\u2713'),
    XMARK = chalk.red('\u2718');

module.exports = function treeReporter(runner) {
    var failed, passed, skipped, tabLevel;

    function tab(string) {
        return new Array(tabLevel + 1).join('  ') + string;
    }

    function reportSuccess(data) {
        report(CHECK, data.stateName, data.browserId);
    }

    function reportFail(data) {
        report(XMARK, data.stateName, data.browserId);
    }

    function report(mark, stateName, browserId) {
        console.log(tab('%s %s ' + chalk.yellow('[%s]')), mark, stateName, browserId);
    }

    runner.on('begin', function() {
        failed = passed = skipped = tabLevel = 0;
    });

    runner.on('beginSuite', function(suiteName) {
        console.log(tab(chalk.underline(suiteName)));
        tabLevel++;
    });

    runner.on('endSuite', function() {
        tabLevel--;
    });

    runner.on('skipState', function(suiteName, stateName, browserId) {
        skipped++;
        console.log(tab(chalk.cyan('- %s [%s]')), stateName, browserId);
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

        tabLevel++;
        if (error.originalError) {
            error = error.originalError;
        }
        console.log(tab(error.stack || error.message));

        tabLevel--;

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
