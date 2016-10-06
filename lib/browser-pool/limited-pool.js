'use strict';

const Pool = require('./pool');
const CancelledError = require('../errors/cancelled-error');
const Promise = require('bluebird');
const log = require('debug')('gemini:pool:limited');

module.exports = class LimitedPool extends Pool {
    static create(limit, underlyingPool) {
        return new LimitedPool(limit, underlyingPool);
    }

    /**
     * @extends BasicPool
     * @param {Number} limit
     * @param {BasicPool} underlyingPool
     */
    constructor(limit, underlyingPool) {
        super();

        this.underlyingPool = underlyingPool;
        this._limit = limit;
        this._launched = 0;
        this._requests = 0;
        this._requestQueue = [];
    }

    getBrowser(id) {
        log(`get browser ${id} (launched ${this._launched}, limit ${this._limit})`);

        ++this._requests;
        return this._getBrowser(id)
            .catch((e) => {
                --this._requests;
                return Promise.reject(e);
            });
    }

    freeBrowser(browser, opts) {
        log('free browser', browser);
        --this._requests;

        const force = opts && opts.force || this._launched > this._requests;
        return this.underlyingPool.freeBrowser(browser, {force})
            .finally(() => this._launchNextBrowser());
    }

    cancel() {
        log('cancel');
        this._requestQueue.forEach((entry) => entry.reject(new CancelledError()));

        this._requestQueue.length = 0;
        this.underlyingPool.cancel();
    }

    _getBrowser(id) {
        if (this._launched < this._limit) {
            log('can launch one more');
            this._launched++;
            return this._newBrowser(id);
        }

        log('queuing the request');
        return new Promise((resolve, reject) => {
            this._requestQueue.unshift({id, resolve, reject});
        });
    }

    /**
     * @param {String} id
     * @returns {Promise<Browser>}
     */
    _newBrowser(id) {
        log('launching new browser', id);
        return this.underlyingPool.getBrowser(id)
            .catch((e) => {
                this._launchNextBrowser();
                return Promise.reject(e);
            });
    }

    _launchNextBrowser() {
        var queued = this._requestQueue.pop();
        if (queued) {
            log('has queued requests');
            log(`remaining queue length: ${this._requestQueue.length}`);
            this._newBrowser(queued.id)
                .then(queued.resolve, queued.reject);
        } else {
            this._launched--;
        }
    }
};
