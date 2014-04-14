'use strict';

var inherit = require('inherit'),
    Browser = require('./index');

module.exports = inherit({
    __constructor: function(config) {
        this.config = config;
    },

    launch: function(browserConfig) {
        return new Browser(this.config, browserConfig.name, browserConfig.version);
    },

    stop: function(browser) {
        return browser.quit();
    }
});
