'use strict';

module.exports = class BrowserAgent {
    static create(browserId, pool) {
        return new BrowserAgent(browserId, pool);
    }

    constructor(browserId, pool) {
        this.browserId = browserId;
        this._pool = pool;
        this._force = false;
    }

    invalidateSession() {
        this._force = true;
    }

    getBrowser() {
        return this._pool.getBrowser(this.browserId);
    }

    freeBrowser(browser, opts) {
        opts = opts || {};
        opts.force = this._force;

        return this._pool.freeBrowser(browser, opts);
    }
};
