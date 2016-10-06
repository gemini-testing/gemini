'use strict';
var util = require('util'),
    Browser = require('../browser'),
    Pool = require('./pool'),
    signalHandler = require('../signal-handler'),
    _ = require('lodash'),
    Promise = require('bluebird');

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
        browser = Browser.create(this._config.forBrowser(id)),
        launchPromise = browser.launch(this._calibrator);

    activeSessions[browser.id] = {
        browser: browser,
        launchPromise: launchPromise
    };

    return launchPromise
        .then(browser.reset.bind(browser)).thenReturn(browser)
        .catch(function(e) {
            return _this.freeBrowser(browser)
                .then(function() {
                    return Promise.reject(e);
                });
        });
};

Pool.prototype.freeBrowser = function(browser) {
    delete activeSessions[browser.id];
    return browser.quit();
};

signalHandler.on('exit', function() {
    console.log('Killing browsers...');
    return _(activeSessions)
        .map(function(session) {
            var quit_ = session.browser.quit.bind(session.browser);
            return session.launchPromise.then(quit_);
        })
        .thru(Promise.all)
        .value();
});

module.exports = BasicPool;
