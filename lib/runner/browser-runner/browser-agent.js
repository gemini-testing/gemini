'use strict';

var inherit = require('inherit');

var BrowserAgent = inherit({
    __constructor: function(browserId, pool) {
        this.browserId = browserId;
        this._pool = pool;
        this._force = false;
    },

    invalidateSession: function() {
        this._force = true;
    },

    getBrowser: function() {
        return this._pool.getBrowser(this.browserId);
    },

    freeBrowser: function(browser, opts) {
        opts = opts || {};
        opts.force = this._force;

        return this._pool.freeBrowser(browser, opts);
    }
}, {
    create: function(browserId, pool) {
        return new BrowserAgent(browserId, pool);
    }
});

module.exports = BrowserAgent;
