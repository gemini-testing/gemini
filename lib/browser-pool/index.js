'use strict';
var Pool = require('./pool'),
    LimitedPool = require('./limited-pool'),
    PerBrowserLimitedPool = require('./per-browser-limited-pool'),
    CachingPool = require('./caching-pool'),
    Calibrator = require('../calibrator');

/**
 * @param {Config} config
 * @returns {BasicPool}
 */
exports.create = function(config) {
    var calibrator = new Calibrator(),
        pool = new Pool(config, calibrator);

    pool = new LimitedPool(config.system.parallelLimit, pool);
    pool = new CachingPool(config, pool);

    return new PerBrowserLimitedPool(config, pool);
};

exports.CancelledError = LimitedPool.CancelledError;
