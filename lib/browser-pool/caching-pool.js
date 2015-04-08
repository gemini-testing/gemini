'use strict';
var util = require('util'),
    q = require('q'),
    _ = require('lodash'),
    BasicPool = require('./basic-pool');

/**
 * @constructor
 * @extends BasicPool
 * @param {BasicPool} underlyingPool
 */
function CachingPool(underlyingPool) {
    this.underlyingPool = underlyingPool;
    this._freeBrowsers = {};
}

util.inherits(CachingPool, BasicPool);

CachingPool.prototype.getBrowser = function(id) {
    if (_.isEmpty(this._freeBrowsers[id])) {
        return this.underlyingPool.getBrowser(id);
    }

    var browser = this._freeBrowsers[id].pop();
    return browser.reset().thenResolve(browser);
};

CachingPool.prototype.freeBrowser = function(browser) {
    var _this = this;
    return q.fcall(function() {
        var id = browser.id;
        _this._freeBrowsers[id] = _this._freeBrowsers[id] || [];
        _this._freeBrowsers[id].push(browser);
    });
};

CachingPool.prototype.finalizeBrowsers = function(id) {
    if (_.isEmpty(this._freeBrowsers[id])) {
        return q();
    }
    return q.all(this._freeBrowsers[id]
        .map(this.underlyingPool.freeBrowser.bind(this.underlyingPool))
    );
};

module.exports = CachingPool;
