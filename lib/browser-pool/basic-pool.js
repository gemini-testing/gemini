'use strict';
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
};

/**
 * @param {String} id
 */
BasicPool.prototype.finalizeBrowsers = function(id) {
};

module.exports = BasicPool;
