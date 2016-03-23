'use strict';

var Flat = require('./flat'),
    FlatVerbose = require('./flat-verbose');

module.exports = {
    mkFlat: make(Flat),
    mkFlatVerbose: make(FlatVerbose)
};

function make(Ctr) {
    return function(runner) {
        var reporter = new Ctr();
        reporter.attachRunner(runner);
    };
}
