'use strict';

var Flat = require('./flat'),
    inherit = require('inherit');

module.exports = inherit(Flat, {
    _formatStateInfo: function(result) {
        var tmpl = result.state
            ? ' ${state} ${chalk.underline(name)} [${chalk.yellow(bId)}: ${chalk.blue(sId)}]'
            : ' ${state} [${chalk.yellow(bId)}: ${chalk.blue(sId)}]';

        return this._compile(tmpl, {
            state: result.suite.path.join(' '),
            name: result.state && result.state.name,
            bId: result.browserId,
            sId: result.sessionId || 'unknown session id'
        });
    }
});
