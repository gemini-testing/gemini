'use strict';

var chalk = require('chalk');

var CHECK = chalk.green('\u2713'),
    XMARK = chalk.red('\u2718'),
    REPORT_LINE = '  %s %s ' + chalk.cyan('[%s]');

module.exports = function treeReporter(tester) {
    var failed, passed;

    tester.on('begin', function() {
        failed = passed = 0;
    });

    tester.on('beginPlan', function(planName) {
        console.log(chalk.underline(planName));
    });

    tester.on('endTest', function(result) {
        if (result.equal) {
            console.log(REPORT_LINE, CHECK, result.stateName, result.browserName);
            passed++;
        } else {
            console.log(REPORT_LINE, XMARK, result.stateName, result.browserName);
            failed++;
        }
    });

    tester.on('error', function(error) {
        console.log(REPORT_LINE, XMARK, error.stateName, error.browserName);

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
