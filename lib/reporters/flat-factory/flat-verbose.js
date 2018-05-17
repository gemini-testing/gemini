'use strict';

const _ = require('lodash');
const chalk = require('chalk');
const Flat = require('./flat');

module.exports = class FlatVerbose extends Flat {
    _formatStateInfo(result) {
        const {suite, state, browserId, sessionId = 'unknown session id'} = result;
        const suiteFullname = suite.path.join(' ');
        const stateName = state ? `${chalk.underline(state.name)}` : '';

        const session = suite.shouldSkip(browserId)
            ? ''
            : `: ${chalk.blue(sessionId)}`;

        const browserInfo = `[${chalk.yellow(browserId)}${session}]`;

        return _([suiteFullname, stateName, browserInfo]).compact().join(' ');
    }
};
