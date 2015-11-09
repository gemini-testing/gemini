'use strict';

var inherit = require('inherit'),
    QEmitter = require('qemitter');

var Runner = inherit(QEmitter, {
    run: function(suites) {
        throw 'Not implemented';
    },

    _passthroughEvent: function(emitter, event) {
        emitter.on(event, function(data) {
            this.emit(event, data);
        }.bind(this));
    }
});

module.exports = Runner;
