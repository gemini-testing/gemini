'use strict';

var chalk = require('chalk');

var CHECK = chalk.green('\u2713'),
    XMARK = chalk.red('\u2718'),
    REPORT_LINE = '%s %s ' + chalk.cyan('[%s]');

module.exports = function treeReporter(tester) {
    var failed, passed, tabLevel = 0;

    function tab(string) {
        return new Array(tabLevel + 1).join('  ') + string;
    }

    function reportSuccess(data) {
        console.log(tab(REPORT_LINE), CHECK, data.stateName, data.browserName);
    }

    function reportFail(data) {
        console.log(tab(REPORT_LINE), XMARK, data.stateName, data.browserName);
    }

    tester.on('begin', function() {
        failed = passed = tabLevel = 0;
    });

    tester.on('beginSuite', function(suiteName) {
        console.log(tab(chalk.underline(suiteName)));
        tabLevel++;
    });

    tester.on('endSuite', function() {
        tabLevel--;
    });

    tester.on('endTest', function(result) {
        if (result.equal) {
            reportSuccess(result);
            passed++;
        } else {
            reportFail(result);
            failed++;
        }
    });

    tester.on('error', function(error) {
        reportFail(error);

        if (error.originalError) {
            error = error.originalError;
        }

        console.log(error.stack || error.message);
        failed++;
    });

    tester.on('end', function() {
        var total = failed + passed;
        console.log('Total: %s Passed: %s Failed: %s',
                    chalk.underline(total),
                    chalk.green(passed),
                    chalk.red(failed));
    });
};
