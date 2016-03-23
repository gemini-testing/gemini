'use strict';

exports.requireWithNoCache = function(moduleName) {
    var result = require(moduleName);
    delete require.cache[moduleName];
    return result;
};

exports.logger = {
    log: console.log,
    warn: console.warn,
    error: console.error
};
