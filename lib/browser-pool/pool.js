'use strict';
var util = require('util'),
    Browser = require('../browser'),
    BasicPool = require('./basic-pool');

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
    var browser = new Browser(this._config, id);
    return browser.launch(this._calibrator).thenResolve(browser);
};

Pool.prototype.freeBrowser = function(browser) {
    return browser.quit();
};

module.exports = Pool;
