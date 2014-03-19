'use strict';

var inherit = require('inherit'),
    Browser = require('./index');

module.exports = inherit({
    __constructor: function(config) {
        this.config = config;
    },

    launch: function(name) {
        return new Browser(this.config, name);
    },

    stop: function(browser) {
        return browser.quit();
    }
});
