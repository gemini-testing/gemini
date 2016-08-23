'use strict';

const Flat = require('./flat');

module.exports = class FlatVerbose extends Flat {
    _formatStateInfo(result) {
        const tmpl = result.state
            ? ' ${state} ${chalk.underline(name)} [${chalk.yellow(bId)}: ${chalk.blue(sId)}]'
            : ' ${state} [${chalk.yellow(bId)}: ${chalk.blue(sId)}]';

        return this._compile(tmpl, {
            state: result.suite.path.join(' '),
            name: result.state && result.state.name,
            bId: result.browserId,
            sId: result.sessionId || 'unknown session id'
        });
    }
};
