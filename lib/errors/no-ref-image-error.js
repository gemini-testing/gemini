'use strict';

var inherit = require('inherit'),
    StateError = require('./state-error');

var NoRefImageError = inherit(StateError, {
    /**
     * @constructor
     * @param {String} refImagePath
     * @param {StateResult} result
     */
    __constructor: function(refImagePath, result) {
        this.message = 'Can not find reference image at ' + refImagePath + '\n' +
            'Run `gemini gather` command to capture all reference images.';

        this.suiteName = result.suiteName;
        this.suiteFullName = result.suiteFullName;
        this.suiteId = result.suiteId;
        this.stateName = result.stateName;
        this.browserId = result.browserId;
    }
});

module.exports = NoRefImageError;

/**
 *
 * @typedef {Object} StateResult
 * @property {String} suiteName
 * @property {String} suiteId
 * @property {String} stateName
 * @property {String} browserId
 */
