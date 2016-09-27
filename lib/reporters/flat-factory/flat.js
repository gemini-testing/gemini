'use strict';

const _ = require('lodash');
const chalk = require('chalk');

const logger = require('../../utils').logger;
const TestCounter = require('../utils/test-counter');

const Events = require('../../constants/events');

const ICON_SUCCESS = chalk.green('✓');
const ICON_NOT_UPDATED = chalk.gray('✓');
const ICON_FAIL = chalk.red('✘');
const ICON_WARN = chalk.bold.yellow('!');
const ICON_RETRY = chalk.yellow('⟳');

module.exports = class Flat {
    constructor() {
        this._counter = new TestCounter();
    }

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

    _compile(tmpl, data) {
        return _.template(tmpl, {
            imports: {
                chalk: chalk
            }
        })(data);
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
        logger.log(ICON_RETRY + this._formatRetryInfo(result));
        this._logError(result);

        this._counter.onRetry(result);
    }

    _onPassed(result) {
        logger.log(ICON_SUCCESS + this._formatStateInfo(result));
        this._counter.onPassed(result);
    }

    _onUpdated(result) {
        logger.log(ICON_SUCCESS + this._formatStateInfo(result));
        this._counter.onUpdated(result);
    }

    _onNotUpdated(result) {
        logger.log(ICON_NOT_UPDATED + this._formatStateInfo(result));
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
