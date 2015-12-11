'use strict';

var inherit = require('inherit'),
    _ = require('lodash'),
    chalk = require('chalk'),
    logger = require('../../utils').logger,
    TestCounter = require('../utils/test-counter'),

    RunnerEvents = require('../../constants/runner-events'),

    ICON_SUCCESS = chalk.green('\u2713'),
    ICON_FAIL = chalk.red('\u2718'),
    ICON_WARN = chalk.bold.yellow('!'),
    ICON_RETRY = chalk.yellow('⟳');

module.exports = inherit({
    __constructor: function() {
        this._counter = new TestCounter();
    },

    attachRunner: function(runner) {
        runner.on(RunnerEvents.END_SESSION, this._counter.onEndSession.bind(this._counter));
        runner.on(RunnerEvents.END_TEST, this._onEndTest.bind(this));
        runner.on(RunnerEvents.RETRY, this._onRetry.bind(this));
        runner.on(RunnerEvents.CAPTURE, this._onCapture.bind(this));
        runner.on(RunnerEvents.ERROR, this._onError.bind(this));
        runner.on(RunnerEvents.WARNING, this._onWarning.bind(this));
        runner.on(RunnerEvents.END, this._onEnd.bind(this));
        runner.on(RunnerEvents.INFO, this._onInfo.bind(this));
        runner.on(RunnerEvents.SKIP_STATE, this._onSkipState.bind(this));
    },

    _compile: function(tmpl, data) {
        return _.template(tmpl, {
            imports: {
                chalk: chalk
            }
        })(data);
    },

    _onEndTest: function(result) {
        var handler = result.equal? this._onCapture : this._onError;
        handler.call(this, result);
    },

    _onRetry: function(result) {
        logger.log(ICON_RETRY + this._formatRetryInfo(result));
        this._counter.onRetry(result);
    },

    _onCapture: function(result) {
        logger.log(ICON_SUCCESS + this._formatStateInfo(result));
        this._counter.onPassed(result);
    },

    _onError: function(result) {
        logger.log(ICON_FAIL + this._formatStateInfo(result));

        if (result.message) {
            logger.error(result.message);
        }

        if (result.originalError && result.originalError.stack) {
            logger.error(result.originalError.stack);
        }

        this._counter.onFailed(result);
    },

    _onWarning: function(result) {
        logger.log(ICON_WARN + this._formatStateInfo(result));
        logger.warn(result.message);

        this._counter.onSkipped(result);
    },

    _onSkipState: function(result) {
        logger.log(ICON_WARN + this._formatStateInfo(result)
            + (result.suite.skipComment? chalk.yellow(' reason: ' + result.suite.skipComment) : ''));

        this._counter.onSkipped(result);
    },

    _onInfo: function(result) {
        logger.warn(result.message);
    },

    _onEnd: function() {
        var result = this._counter.getResult();

        logger.log('Total: %s Passed: %s Failed: %s Skipped: %s Retries: %s',
            chalk.underline(result.total),
            chalk.green(result.passed),
            chalk.red(result.failed),
            chalk.cyan(result.skipped),
            chalk.cyan(result.retries)
        );
    },

    _formatRetryInfo: function(result) {
        var tmpl = '${stateInfo} will be retried. Retries left: ${chalk.yellow(retriesLeft)}';

        return this._compile(tmpl, {
            stateInfo: this._formatStateInfo(result),
            retriesLeft: result.retriesLeft
        });
    },

    _formatStateInfo: function(result) {
        var tmpl = result.state
            ? ' ${state} ${chalk.underline(name)} [${chalk.yellow(id)}]'
            : ' ${state} [${chalk.yellow(id)}]';

        return this._compile(tmpl, {
            state: result.suite.path.join(' '),
            name: result.state && result.state.name,
            id: result.browserId
        });
    }
});
