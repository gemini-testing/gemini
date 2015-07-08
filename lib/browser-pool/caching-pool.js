'use strict';
var util = require('util'),
    BasicPool = require('./basic-pool'),
    LimitedUseSet = require('./limited-use-set');

/**
 * @constructor
 * @extends BasicPool
 * @param {BasicPool} underlyingPool
 */
function CachingPool(config, underlyingPool) {
    this.underlyingPool = underlyingPool;
    this._caches = {};
    var _this = this,
        freeBrowser = underlyingPool.freeBrowser.bind(underlyingPool);

    config.getBrowserIds().forEach(function(id) {
        var browserConfig = config.forBrowser(id);
        // browser does not get put in a set on first usages, so if
        // we want to limit it usage to N times, we must set N-1 limit
        // for the set.
        _this._caches[id] = new LimitedUseSet(browserConfig.suitesPerSession - 1, freeBrowser);
    });
}

util.inherits(CachingPool, BasicPool);

CachingPool.prototype.getBrowser = function(id) {
    var browser = this._caches[id].pop();
    if (!browser) {
        return this.underlyingPool.getBrowser(id);
    }

    return browser.reset().thenResolve(browser);
};

CachingPool.prototype.freeBrowser = function(browser) {
    return this._caches[browser.id].push(browser);
};

CachingPool.prototype.finalizeBrowsers = function(id) {
    return this._caches[id].clear();
};

module.exports = CachingPool;
