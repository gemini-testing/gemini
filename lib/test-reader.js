'use strict';

var path = require('path'),
    _ = require('lodash'),
    Suite = require('./suite'),
    pathUtils = require('./path-utils'),
    publicApi = require('./public-api'),
    exposeTestsApi = require('./tests-api'),

    DEFAULT_SPECS_DIR = 'gemini';

module.exports = function(paths, projectRoot) {
    if (_.isEmpty(paths)) {
        paths = [getDefaultSpecsDir(projectRoot)];
    }

    return pathUtils.expandPaths(paths)
        .then(function(expanded) {
            var rootSuite = Suite.create('');
            exposeTestsApi(publicApi, rootSuite);

            expanded.forEach(requireWithNoCache);
            return rootSuite;
        });
};

///
function getDefaultSpecsDir(projectRoot) {
    return path.join(projectRoot, DEFAULT_SPECS_DIR);
}

///
function requireWithNoCache(moduleName) {
    var result = require(moduleName);
    delete require.cache[moduleName];
    return result;
}
