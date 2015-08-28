'use strict';

exports.requireWithNoCache = function(moduleName) {
    var result = require(moduleName);
    delete require.cache[moduleName];
    return result;
};
