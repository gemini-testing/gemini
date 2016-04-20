'use strict';

var inherit = require('inherit'),
    StateError = require('./state-error');

var NoRefImageError = inherit(StateError, {
    /**
     * @constructor
     * @param {String} refImagePath
     * @param {StateResult} result
     */
    __constructor: function(refImagePath, currentPath) {
        this.name = 'NoRefImageError';
        this.message = 'Can not find reference image at ' + refImagePath + '.\n' +
            'Run `gemini update` command to capture all reference images.';

        this.currentPath = currentPath;
    }
});

module.exports = NoRefImageError;
