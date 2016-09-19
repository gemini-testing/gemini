'use strict';

const _ = require('lodash');

module.exports = class BrowserAgent {
    static create(browserId, pool) {
        return new BrowserAgent(browserId, pool);
    }

    constructor(browserId, pool) {
        this.browserId = browserId;
        this._pool = pool;
        this._sessions = [];
    }

    getBrowser() {
        return this._pool.getBrowser(this.browserId)
            .then((browser) => {
                if (_.includes(this._sessions, browser.sessionId)) {
                    return this.freeBrowser(browser).then(() => this.getBrowser());
                }

                this._sessions.push(browser.sessionId);
                return browser;
            });
    }

    freeBrowser(browser, opts) {
        return this._pool.freeBrowser(browser, opts);
    }
};
