'use strict';

var chalk = require('chalk');


var CHECK = '\u2713',
    XMARK = '\u2718';

module.exports = function treeReporter(tester) {
    var failed, passed;

    tester.on('beginTests', function() {
        failed = passed = 0;
    });

    tester.on('beginPlan', function(planName) {
        console.log(chalk.underline(planName));
    });

    tester.on('endTest', function(result) {
        if (result.equal) {
            console.log('  ' + chalk.green(CHECK) + ' ' + result.state);
            passed++;
        } else {
            console.log('  ' + chalk.red(XMARK + ' ' + result.state));
            failed++;
        }
    });

    tester.on('endTests', function() {
        var total = failed + passed;
        console.log('Total: %s Passed: %s Failed: %s',
                    chalk.underline(total),
                    chalk.green(passed),
                    chalk.red(failed));
    });
};
