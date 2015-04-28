'use strict';
var chalk = require('chalk'),
    util = require('util'),

    RunnerEvents = require('../constants/runner-events');

var BASE_TEMPLATE = '%s %s ' + chalk.underline('%s') + ' ' + chalk.yellow('[%s]'),
    SUCCESS_TEMPLATE = util.format(BASE_TEMPLATE, chalk.green('\u2713')),
    FAIL_TEMPLATE    = util.format(BASE_TEMPLATE, chalk.red('\u2718')),
    WARNING_TEMPLATE = util.format(BASE_TEMPLATE, chalk.bold.yellow('!'));

function log(template, stateResult) {
    console.log(template, stateResult.suitePath.join(' '), stateResult.stateName, stateResult.browserId);
}

module.exports = function(runner) {
    var failed, passed, skipped;

    runner.on(RunnerEvents.BEGIN, function() {
        failed = passed = skipped = 0;
    });

    //for test command
    runner.on(RunnerEvents.END_TEST, function(result) {
        if (result.equal) {
            log(SUCCESS_TEMPLATE, result);
            passed++;
        } else {
            log(FAIL_TEMPLATE, result);
            failed++;
        }
    });

    //for gather command
    runner.on(RunnerEvents.CAPTURE, function(result) {
        log(SUCCESS_TEMPLATE, result);
        passed++;
    });

    runner.on(RunnerEvents.ERROR, function(errorResult) {
        log(FAIL_TEMPLATE, errorResult);
        failed++;

        var e = errorResult.originalError || errorResult;
        console.error(e.stack || e.message);
    });

    /**
     * @param {NoRefImageError} errorResult
     */
    runner.on(RunnerEvents.WARNING, function(errorResult) {
        log(WARNING_TEMPLATE, errorResult);
        skipped++;

        console.warn(errorResult.message);
    });

    runner.on(RunnerEvents.END, function() {
        var total = failed + passed + skipped;
        console.log('Total: %s Passed: %s Failed: %s Skipped: %s',
            chalk.underline(total),
            chalk.green(passed),
            chalk.red(failed),
            chalk.cyan(skipped)
        );
    });
};
