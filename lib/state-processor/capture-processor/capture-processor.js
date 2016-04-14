'use strict';

var inherit = require('inherit'),
    q = require('q');

module.exports = inherit({
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
