'use strict';

var q = require('q'),
    chalk = require('chalk'),
    GeminiError = require('../errors/gemini-error');

exports.handleErrors = function(error) {
    if (error instanceof GeminiError) {
        return handleGeminiError(error);
    } else if (error.status === 13) {
        //unknow wd error
        return handleUnknownWdError(error);
    }
    return q.reject(error);
};

function handleGeminiError(error) {
    console.error(chalk.red('Error: ') + error.message);
    if (error.advice) {
        console.error(chalk.green('To fix:'), error.advice);
    }
    return q.resolve(1);
}

function handleUnknownWdError(error) {
    console.log(chalk.red('JSONWire Error:'), error.cause.value.message);
    return q.resolve(1);
}
