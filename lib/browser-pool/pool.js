'use strict';
var util = require('util'),
    Browser = require('../browser'),
    BasicPool = require('./basic-pool'),
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
    var browser = new Browser(this._config, id),
        launchPromise = browser.launch(this._calibrator);

    activeSessions[browser.id] = {
        browser: browser,
        launchPromise: launchPromise
    };

    return launchPromise.thenResolve(browser);
};

Pool.prototype.freeBrowser = function(browser) {
    delete activeSessions[browser.id];
    return browser.quit();
};

process.on('SIGHUP', quitBrowsersAndExit(1));
process.on('SIGINT', quitBrowsersAndExit(2));
process.on('SIGTERM', quitBrowsersAndExit(15));

function quitBrowsersAndExit(signalNo) {
    return function() {
        console.log('Killing browsers...');
        _(activeSessions)
            .map(function(session) {
                var quit_ = session.browser.quit.bind(session.browser);
                return Q.when(session.launchPromise, quit_);
            })
            .thru(Q.all)
            .value()
            .then(function() {
                console.log('Done.');
                process.exit(128 + signalNo);
            })
            .done();
    };
}

module.exports = Pool;
