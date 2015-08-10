'use strict';
var util = require('util'),
    _ = require('lodash'),
    BasicPool = require('./basic-pool'),
    LimitedPool = require('./limited-pool'),
    log = require('debug')('gemini:pool:per-browser-limited');

function PerBrowserLimitedPool(config, underlyingPool) {
    var browserPools = {};
    config.getBrowserIds().forEach(function(id) {
        var browserConfig = config.forBrowser(id);
        browserPools[id] = new LimitedPool(browserConfig.sessionsPerBrowser, underlyingPool);
    });
    this._browserPools = browserPools;
}

util.inherits(PerBrowserLimitedPool, BasicPool);

PerBrowserLimitedPool.prototype.getBrowser = function(id) {
    log('request %s', id);
    return this._browserPools[id].getBrowser(id);
};

PerBrowserLimitedPool.prototype.freeBrowser = function(browser) {
    log('free %o', browser);
    return this._browserPools[browser.id].freeBrowser(browser);
};

PerBrowserLimitedPool.prototype.finalizeBrowsers = function(id) {
    log('finalize %s', id);
    return this._browserPools[id].finalizeBrowsers(id);
};

PerBrowserLimitedPool.prototype.cancel = function() {
    log('cancel');

    _.each(this._browserPools, function(pool) {
        pool.cancel();
    });
};

module.exports = PerBrowserLimitedPool;
