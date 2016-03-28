'use strict';

exports.requireWithNoCache = function(moduleName) {
    delete require.cache[moduleName];
    return require(moduleName);
};

exports.logger = {
    log: console.log,
    warn: console.warn,
    error: console.error
};
