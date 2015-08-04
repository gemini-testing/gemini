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
        this.message = 'Can not find reference image at ' + refImagePath + '.\n' +
            'Run `gemini gather` command to capture all reference images.';

        this.currentPath =  result.currentPath;
        this.suite = result.suite;
        this.state = result.state;
        this.browserId = result.browserId;
    }
});

module.exports = NoRefImageError;
