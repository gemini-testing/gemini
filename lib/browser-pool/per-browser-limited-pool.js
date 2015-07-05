'use strict';
var util = require('util'),
    BasicPool = require('./basic-pool'),
    LimitedPool = require('./limited-pool');

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
    return this._browserPools[id].getBrowser(id);
};

PerBrowserLimitedPool.prototype.freeBrowser = function(browser) {
    return this._browserPools[browser.id].freeBrowser(browser);
};

PerBrowserLimitedPool.prototype.finalizeBrowsers = function(id) {
    this._browserPools[id].finalizeBrowsers(id);
};

module.exports = PerBrowserLimitedPool;
