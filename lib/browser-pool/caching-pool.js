'use strict';
var Promise = require('bluebird'),
    util = require('util'),
    Pool = require('./pool'),
    LimitedUseSet = require('./limited-use-set'),
    log = require('debug')('gemini:pool:caching');

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

util.inherits(CachingPool, Pool);

CachingPool.prototype.getBrowser = function(id) {
    log('request for %s', id);
    var browser = this._caches[id].pop();
    if (!browser) {
        log('no cached browser, requesting new');
        return this.underlyingPool.getBrowser(id);
    }

    log('has cached browser %o', browser);
    return browser.reset()
        .catch(function(e) {
            var reject = Promise.reject.bind(null, e);
            return this.underlyingPool.freeBrowser(browser)
                .then(reject, reject);
        }.bind(this)).thenReturn(browser);
};

/**
 * Free browser
 * @param {Browser} browser session instance
 * @param {Object} [options] - advanced options
 * @param {Boolean} [options.force] - if `true` than browser should
 * not be cached
 * @returns {Promise<undefined>}
 */
CachingPool.prototype.freeBrowser = function(browser, options) {
    log('free %o', browser);
    const shouldBeFreed = options && options.force;
    return shouldBeFreed
        ? this.underlyingPool.freeBrowser(browser)
        : this._caches[browser.id].push(browser);
};

CachingPool.prototype.cancel = function() {
    log('cancel');
    this.underlyingPool.cancel();
};

module.exports = CachingPool;
