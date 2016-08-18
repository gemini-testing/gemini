'use strict';

const Flat = require('./flat');
const FlatVerbose = require('./flat-verbose');

const make = (Ctr) => {
    return (runner) => {
        const reporter = new Ctr();
        reporter.attachRunner(runner);
    };
};

module.exports = {
    mkFlat: make(Flat),
    mkFlatVerbose: make(FlatVerbose)
};
