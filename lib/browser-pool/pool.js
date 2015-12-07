'use strict';
var util = require('util'),
    Browser = require('../browser'),
    BasicPool = require('./basic-pool'),
    signalHandler = require('../signal-handler'),
    _ = require('lodash'),
    Q = require('q');

var activeSessions = {};

/**
 * @constructor
 * @extends BasicPool
 * @param {Config} config
 * @param {Calibrator} calibrator
 */
function Pool(config, calibrator) {
    this._config = config;
    this._calibrator = calibrator;
}

util.inherits(Pool, BasicPool);

Pool.prototype.getBrowser = function(id) {
    var _this = this,
        browser = new Browser(this._config.forBrowser(id)),
        launchPromise = browser.launch(this._calibrator);

    activeSessions[browser.id] = {
        browser: browser,
        launchPromise: launchPromise
    };

    return launchPromise
        .then(browser.reset.bind(browser))
        .thenResolve(browser)
        .fail(function(e) {
            return _this.freeBrowser(browser)
                .then(function() {
                    return Q.reject(e);
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
            return Q.when(session.launchPromise, quit_);
        })
        .thru(Q.all)
        .value();
});

module.exports = Pool;
