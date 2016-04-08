'use strict';

var inherit = require('inherit'),
    q = require('q');

module.exports = inherit({
    __constructor: function(config) {
        this._config = config;
    },

    getProcessedCaptureEventName: function() {
        throw new Error('Not implemented');
    },

    prepare: function(emitter) {
        return q();
    },

    exec: function(capture, opts) {
        throw new Error('Not implemented');
    }
});
