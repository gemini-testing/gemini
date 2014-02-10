var pkg = require('../package.json');

module.exports = require('coa').Cmd()
    .name(process.argv[1])
    .title(pkg.description)
    .helpful()
    .opt()
        .name('version')
        .title('Show version')
        .long('version')
        .flag()
        .act(function(opts) {
            return pkg.version;
        })
        .end()
    .cmd().name('gather').apply(require('./cli/gather')).end();
