'use strict';
const _ = require('lodash');

exports.requireWithNoCache = function(moduleName) {
    delete require.cache[moduleName];
    return require(moduleName);
};

exports.logger = {
    log: console.log,
    warn: console.warn,
    error: console.error
};

exports.urlJoin = (...args) =>
    args
        .map((value, index) => (index ? _.trim : _.trimEnd)(value, '/'))
        .join('/');
