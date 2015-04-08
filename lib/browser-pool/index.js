'use strict';
var Pool = require('./pool'),
    LimitedPool = require('./limited-pool'),
    CachingPool = require('./caching-pool'),
    Calibrator = require('../calibrator');

/**
 * @param {Config} config
 * @returns {BasicPool}
 */
exports.create = function(config) {
    var calibrator = new Calibrator(),
        pool = new Pool(config, calibrator);

    if (config.parallelLimit) {
        pool = new LimitedPool(config.parallelLimit, pool);
    }

    return config.sessionMode === 'perSuite'? pool : new CachingPool(pool);
};
