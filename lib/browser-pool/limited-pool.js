'use strict';
var util = require('util'),
    BasicPool = require('./basic-pool'),
    q = require('q');

/**
 * @constructor
 * @extends BasicPool
 * @param {Number} limit
 * @param {BasicPool} underlyingPool
 */
function LimitedPool(limit, underlyingPool) {
    this.underlyingPool = underlyingPool;
    this._limit = limit;
    this._launched = 0;
    this._deferQueue = [];
}

util.inherits(LimitedPool, BasicPool);

LimitedPool.prototype.getBrowser = function(id) {
    if (this._canLaunchBrowser) {
        this._launched++;
        return this._newBrowser(id);
    }
    var defer = q.defer();
    this._deferQueue.unshift({
        id: id,
        defer: defer
    });
    return defer.promise;
};

Object.defineProperty(LimitedPool.prototype, '_canLaunchBrowser', {
    get: function() {
        return this._launched < this._limit;
    }
});

/**
 * @param {String} id
 * @returns {Promise.<Browser>}
 */
LimitedPool.prototype._newBrowser = function(id) {
    return this.underlyingPool.getBrowser(id);
};

LimitedPool.prototype.freeBrowser = function(browser) {
    return this.underlyingPool.freeBrowser(browser)
        .then(this._launchNextBrowser.bind(this));
};

/**
 * @returns {Boolean}
 */
LimitedPool.prototype._launchNextBrowser = function() {
    var queued = this._deferQueue.pop();
    if (queued) {
        return this._newBrowser(queued.id)
            .then(queued.defer.resolve);
    } else {
        this._launched--;
    }
};

LimitedPool.finalizeBrowsers = function(id) {
    return this.underlyingPool.finalizeBrowsers(id);
};

module.exports = LimitedPool;
