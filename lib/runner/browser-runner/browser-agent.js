'use strict';

module.exports = class BrowserAgent {
    static create(browserId, pool) {
        return new BrowserAgent(browserId, pool);
    }

    constructor(browserId, pool) {
        this.browserId = browserId;
        this._pool = pool;
    }

    getBrowser() {
        return this._pool.getBrowser(this.browserId);
    }

    freeBrowser(browser, opts) {
        return this._pool.freeBrowser(browser, opts);
    }
};
