'use strict';

const _ = require('lodash');
const chalk = require('chalk');

const logger = require('../../utils').logger;
const TestCounter = require('../utils/test-counter');

const RunnerEvents = require('../../constants/runner-events');

const ICON_SUCCESS = chalk.green('\u2713');
const ICON_FAIL = chalk.red('\u2718');
const ICON_WARN = chalk.bold.yellow('!');
const ICON_RETRY = chalk.yellow('⟳');
const ICON_NOT_UPDATED = chalk.gray('\u2713');

module.exports = class Flat {
    constructor() {
        this._counter = new TestCounter();
    }

    attachRunner(runner) {
        runner.on(RunnerEvents.END_TEST, this._onEndTest.bind(this));
        runner.on(RunnerEvents.RETRY, this._onRetry.bind(this));
        runner.on(RunnerEvents.UPDATE_RESULT, this._onUpdateResult.bind(this));
        runner.on(RunnerEvents.ERROR, this._onError.bind(this));
        runner.on(RunnerEvents.WARNING, this._onWarning.bind(this));
        runner.on(RunnerEvents.END, this._onEnd.bind(this));
        runner.on(RunnerEvents.INFO, this._onInfo.bind(this));
        runner.on(RunnerEvents.SKIP_STATE, this._onSkipState.bind(this));
    }

    _compile(tmpl, data) {
        return _.template(tmpl, {
            imports: {
                chalk: chalk
            }
        })(data);
    }

    _onEndTest(result) {
        const handler = result.equal ? this._onCapture : this._onError;
        handler.call(this, result);
    }

    _onRetry(result) {
        logger.log(ICON_RETRY + this._formatRetryInfo(result));
        this._logError(result);

        this._counter.onRetry(result);
    }

    _onUpdateResult(result) {
        const handler = result.updated ? this._onCapture : this._onNotUpdateResult;
        handler.call(this, result);
    }

    _onNotUpdateResult(result) {
        logger.log(ICON_NOT_UPDATED + this._formatStateInfo(result));
        this._counter.onPassed(result);
    }

    _onCapture(result) {
        logger.log(ICON_SUCCESS + this._formatStateInfo(result));
        this._counter.onPassed(result);
    }

    _onError(result) {
        logger.log(ICON_FAIL + this._formatStateInfo(result));
        this._logError(result);

        this._counter.onFailed(result);
    }

    _onWarning(result) {
        logger.log(ICON_WARN + this._formatStateInfo(result));
        logger.warn(result.message);

        this._counter.onSkipped(result);
    }

    _onSkipState(result) {
        logger.log(ICON_WARN + this._formatStateInfo(result)
            + (result.suite.skipComment ? chalk.yellow(' reason: ' + result.suite.skipComment) : ''));

        this._counter.onSkipped(result);
    }

    _onInfo(result) {
        logger.warn(result.message);
    }

    _onEnd() {
        const result = this._counter.getResult();

        logger.log('Total: %s Passed: %s Failed: %s Skipped: %s Retries: %s',
            chalk.underline(result.total),
            chalk.green(result.passed),
            chalk.red(result.failed),
            chalk.cyan(result.skipped),
            chalk.cyan(result.retries)
        );
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
        const tmpl = '${stateInfo} will be retried. Retries left: ${chalk.yellow(retriesLeft)}';

        return this._compile(tmpl, {
            stateInfo: this._formatStateInfo(result),
            retriesLeft: result.retriesLeft
        });
    }

    _formatStateInfo(result) {
        const tmpl = result.state
            ? ' ${state} ${chalk.underline(name)} [${chalk.yellow(id)}]'
            : ' ${state} [${chalk.yellow(id)}]';

        return this._compile(tmpl, {
            state: result.suite.path.join(' '),
            name: result.state && result.state.name,
            id: result.browserId
        });
    }
};
