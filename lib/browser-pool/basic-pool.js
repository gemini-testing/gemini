'use strict';
var util = require('util'),
    Browser = require('../browser'),
    Pool = require('./pool'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    CancelledError = require('../errors/cancelled-error');

var activeSessions = {};

/**
 * @constructor
 * @extends BasicPool
 * @param {Config} config
 * @param {Calibrator} calibrator
 */
function BasicPool(config, calibrator) {
    this._config = config;
    this._calibrator = calibrator;
}

util.inherits(BasicPool, Pool);

Pool.prototype.getBrowser = function(id) {
    var _this = this,
        browser = Browser.create(this._config.forBrowser(id));

    return browser.launch(this._calibrator)
        .then(() => {
            if (this._cancelled) {
                return Promise.reject(new CancelledError());
            }

            activeSessions[browser.sessionId] = browser;
        })
        .then(browser.reset.bind(browser)).thenReturn(browser)
        .catch(function(e) {
            return _this.freeBrowser(browser)
                .then(function() {
                    return Promise.reject(e);
                });
        });
};

Pool.prototype.freeBrowser = function(browser) {
    delete activeSessions[browser.sessionId];
    return browser.quit();
};

Pool.prototype.cancel = function() {
    this._cancelled = true;

    _.forEach(activeSessions, (browser) => browser.quit());

    activeSessions = {};
};

module.exports = BasicPool;
