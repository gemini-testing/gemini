'use strict';

const _ = require('lodash');
const chalk = require('chalk');
const Flat = require('./flat');

module.exports = class FlatVerbose extends Flat {
    _formatStateInfo(result) {
        const suite = result.suite.path.join(' ');

        const state = result.state
            ? `${chalk.underline(result.state.name)}`
            : '';

        const session = result.suite.skipped
            ? ''
            : `: ${chalk.blue(result.sessionId || 'unknown session id')}`;

        const browser = `[${chalk.yellow(result.browserId)}${session}]`;

        return _([suite, state, browser]).compact().join(' ');
    }
};
