'use strict';

var pkg = require('../package.json'),
    common = require('./cli/common');

module.exports = require('coa').Cmd()
    .name(process.argv[1])
    .title(pkg.description)
    .helpful()
    .opt()
        .name('version')
        .title('Show version')
        .long('version')
        .flag()
        .end()
    .cmd().name('gather').apply(require('./cli/gather')).end()
    .cmd().name('test').apply(require('./cli/test')).end()
    .act(function(options, args) {
        if (options.version) {
            return pkg.version;
        }
        console.log(this.usage());
        return common.exitCoa(1);
    });
