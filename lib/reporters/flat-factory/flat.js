'use strict';

const _ = require('lodash');
const chalk = require('chalk');

const logger = require('../../utils').logger;

const Events = require('../../constants/events');

const ICON_SUCCESS = chalk.green('✓');
const ICON_NOT_UPDATED = chalk.gray('✓');
const ICON_FAIL = chalk.red('✘');
const ICON_WARN = chalk.bold.yellow('!');
const ICON_RETRY = chalk.yellow('⟳');

module.exports = class Flat {
    attachRunner(runner) {
        runner.on(Events.TEST_RESULT, this._onTestResult.bind(this));
        runner.on(Events.UPDATE_RESULT, this._onUpdateResult.bind(this));
        runner.on(Events.RETRY, this._onRetry.bind(this));
        runner.on(Events.ERROR, this._onError.bind(this));
        runner.on(Events.WARNING, this._onWarning.bind(this));
        runner.on(Events.END, this._onEnd.bind(this));
        runner.on(Events.INFO, this._onInfo.bind(this));
        runner.on(Events.SKIP_STATE, this._onSkipState.bind(this));
    }

    _onTestResult(result) {
        const handler = result.equal ? this._onPassed : this._onError;
        handler.call(this, result);
    }

    _onUpdateResult(result) {
        const handler = result.updated ? this._onUpdated : this._onNotUpdated;
        handler.call(this, result);
    }

    _onRetry(result) {
        logger.log(`${ICON_RETRY} ${this._formatRetryInfo(result)}`);
        this._logError(result);
    }

    _onPassed(result) {
        logger.log(`${ICON_SUCCESS} ${this._formatStateInfo(result)}`);
    }

    _onUpdated(result) {
        logger.log(`${ICON_SUCCESS} ${this._formatStateInfo(result)}`);
    }

    _onNotUpdated(result) {
        logger.log(`${ICON_NOT_UPDATED} ${this._formatStateInfo(result)}`);
    }

    _onError(result) {
        logger.log(`${ICON_FAIL} ${this._formatStateInfo(result)}`);
        this._logError(result);
    }

    _onWarning(result) {
        logger.log(`${ICON_WARN} ${this._formatStateInfo(result)}`);
        logger.warn(result.message);

        this._counter.onSkipped(result);
    }

    _onSkipState(result) {
        const skipReason = result.suite.skipComment
            ? chalk.yellow('reason: ' + result.suite.skipComment)
            : '';

        logger.log(`${ICON_WARN} ${this._formatStateInfo(result)} ${skipReason}`);
    }

    _onInfo(result) {
        logger.warn(result.message);
    }

    _onEnd(result) {
        const message = [
            'Total: ' + chalk.underline(result.total),
            result.updated && 'Updated: ' + chalk.green(result.updated),
            'Passed: ' + (result.updated && chalk.grey(result.passed) || chalk.green(result.passed)),
            'Failed: ' + chalk.red(result.failed),
            'Skipped: ' + chalk.cyan(result.skipped),
            'Retries: ' + chalk.cyan(result.retries)
        ];

        logger.log(_.compact(message).join(' '));
    }

    _logError(result) {
        if (result.message) {
            logger.error(result.message);
        }

        if (result.originalError && result.originalError.stack) {
            logger.error(result.originalError.stack);
        }
    }

    _formatRetryInfo(result) {
        const stateInfo = this._formatStateInfo(result);
        const retriesLeft = result.retriesLeft;

        return `${stateInfo} will be retried. Retries left: ${chalk.yellow(retriesLeft)}`;
    }

    _formatStateInfo(result) {
        const suite = result.suite.path.join(' ');
        const state = result.state && chalk.underline(result.state.name);
        const browserId = `[${chalk.yellow(result.browserId)}]`;

        return _([suite, state, browserId]).compact().join(' ');
    }
};
