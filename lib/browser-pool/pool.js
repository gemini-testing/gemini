'use strict';
var q = require('q');
/**
 * @constructor
 */
function BasicPool() {
}

/**
 * @param {String} id
 * @returns {Promise.<Browser>}
 */
BasicPool.prototype.getBrowser = function(id) {
};

/**
 * @param {Browser} browser
 * @returns {Promise}
 */
BasicPool.prototype.freeBrowser = function(browser) {
    return q.resolve();
};

BasicPool.prototype.cancel = function() {
};

module.exports = BasicPool;
