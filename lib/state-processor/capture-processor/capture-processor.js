'use strict';

var inherit = require('inherit');

module.exports = inherit({
    getProcessedCaptureEventName: function() {
        throw new Error('Not implemented');
    },

    exec: function(capture, opts) {
        throw new Error('Not implemented');
    }
});
