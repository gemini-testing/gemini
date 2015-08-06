'use strict';
var util = require('util'),
    BasicPool = require('./basic-pool'),
    q = require('q'),
    log = require('debug')('gemini:pool:limited');

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
    log('get browser %s (launched %d, limit %d)', id, this._launched, this._limit);
    if (this._canLaunchBrowser) {
        log('can launch one more');
        this._launched++;
        return this._newBrowser(id);
    }

    log('queuing the request');
    var defer = q.defer();
    this._deferQueue.unshift({
        id: id,
        defer: defer
    });
    log('queue length: %d', this._deferQueue.length);
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
    log('launching new browser', id);
    return this.underlyingPool.getBrowser(id);
};

LimitedPool.prototype.freeBrowser = function(browser) {
    log('free browser', browser);
    return this.underlyingPool.freeBrowser(browser)
        .then(this._launchNextBrowser.bind(this));
};

/**
 * @returns {Boolean}
 */
LimitedPool.prototype._launchNextBrowser = function() {
    var queued = this._deferQueue.pop();
    if (queued) {
        log('has queued requests');
        log('remaining queue length: %d', this._deferQueue.length);
        return this._newBrowser(queued.id)
            .then(queued.defer.resolve);
    } else {
        this._launched--;
    }
};

LimitedPool.prototype.finalizeBrowsers = function(id) {
    log('finalize %s', id);
    return this.underlyingPool.finalizeBrowsers(id);
};

LimitedPool.prototype.cancel = function() {
    log('cancel');
    this._deferQueue.forEach(function(entry) {
        entry.defer.reject(new CancelledError());
    });

    this._deferQueue.length = 0;
    this.underlyingPool.cancel();
};

function CancelledError() {
    this.name = 'CancelledError';
    this.message = 'Browser request was cancelled';
    Error.captureStackTrace(this, CancelledError);
}

util.inherits(CancelledError, Error);

module.exports = exports = LimitedPool;
exports.CancelledError = CancelledError;
