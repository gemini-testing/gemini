'use strict';
var Promise = require('bluebird');
/**
 * @constructor
 */
function BasicPool() {
}

/**
 * @returns {Promise.<Browser>}
 */
BasicPool.prototype.getBrowser = function() {
};

/**
 * @param {Browser} browser
 * @returns {Promise}
 */
BasicPool.prototype.freeBrowser = function() {
    return Promise.resolve();
};

BasicPool.prototype.cancel = function() {
};

module.exports = BasicPool;
