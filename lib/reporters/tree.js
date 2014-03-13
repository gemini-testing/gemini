'use strict';

var chalk = require('chalk');


var CHECK = '\u2713',
    XMARK = '\u2718';

function tab(number) {
    return new Array(number + 1).join('  ');
}

module.exports = function treeReporter(tester) {
    var failed, passed;

    tester.on('begin', function() {
        failed = passed = 0;
    });

    tester.on('beginPlan', function(planName) {
        console.log(chalk.underline(planName));
    });

    tester.on('beginState', function(plan, state) {
        console.log(tab(1) + state);
    });

    tester.on('endTest', function(result) {
        if (result.equal) {
            console.log(tab(2) + chalk.green(CHECK) + ' ' + result.browser);
            passed++;
        } else {
            console.log(tab(2) + chalk.red(XMARK + ' ' + result.browser));
            failed++;
        }
    });

    tester.on('end', function() {
        var total = failed + passed;
        console.log('Total: %s Passed: %s Failed: %s',
                    chalk.underline(total),
                    chalk.green(passed),
                    chalk.red(failed));
    });
};
