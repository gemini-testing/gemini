'use strict';
var q = require('q');
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
    return q.resolve();
};

BasicPool.prototype.cancel = function() {
};

module.exports = BasicPool;
