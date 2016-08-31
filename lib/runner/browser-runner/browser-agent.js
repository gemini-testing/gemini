'use strict';

var inherit = require('inherit');

var BrowserAgent = inherit({
    __constructor: function(browserId, pool) {
        this.browserId = browserId;
        this._pool = pool;
    },

    getBrowser: function() {
        return this._pool.getBrowser(this.browserId);
    },

    freeBrowser: function(browser, opts) {
        return this._pool.freeBrowser(browser, opts);
    }
}, {
    create: function(browserId, pool) {
        return new BrowserAgent(browserId, pool);
    }
});

module.exports = BrowserAgent;
