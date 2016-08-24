'use strict';
var _ = require('lodash'),
    BasicPool = require('./basic-pool'),
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
        pool = new BasicPool(config, calibrator);

    pool = new CachingPool(config, pool);
    pool = new PerBrowserLimitedPool(config, pool);

    if (_.isFinite(config.system.parallelLimit)) {
        pool = new LimitedPool(config.system.parallelLimit, pool);
    }

    return pool;
};
