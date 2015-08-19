'use strict';

var chalk = require('chalk'),
    util = require('util'),
    GeminiError = require('../errors/gemini-error');

exports.handleErrors = function(error) {
    printErrorHeader(error);
    if (error instanceof GeminiError) {
        handleGeminiError(error);
    } else if (error.status === 13) {
        //unknow wd error
        handleUnknownWdError(error);
    } else {
        console.error(error.stack || error.message);
    }
    // exit code
    return 1;
};

function printErrorHeader(e) {
    var message = [chalk.red('Critical error')];

    if (e.state) {
        message.push(util.format('while running "%s"', e.state.fullName));
    }

    if (e.browserId) {
        message.push(util.format('in %s', chalk.underline(e.browserId)));
        if (e.browserSessionId) {
            message.push(util.format('(%s)', chalk.yellow(e.browserSessionId)));
        }
    }

    console.error(message.join(' ') + ':');
}

function handleGeminiError(error) {
    console.error(error.message);
    if (error.advice) {
        console.error(chalk.green('To fix:'), error.advice);
    }
}

function handleUnknownWdError(error) {
    console.error(error.cause.value.message);
}
