'use strict';

var inherit = require('inherit'),
    _ = require('lodash'),
    QEmitter = require('qemitter');

var Runner = inherit(QEmitter, {
    run: function(suites) {
        throw 'Not implemented';
    },

    // Allow to pass only one argument with event
    emit: function(type, data) {
        return this.__base(type, data);
    },

    emitAndWait: function(type, data) {
        return this.__base(type, data, {shouldWait: true});
    },

    /**
     * Emit event emitted by emitter
     * @param {EventEmitter} emitter
     * @param {String|String[]} event or array of events to passthrough
     */
    passthroughEvent: function(emitter, event) {
        if (_.isArray(event)) {
            event.forEach(this.passthroughEvent.bind(this, emitter));
            return;
        }

        emitter.on(event, function(data, opts) {
            if (opts && opts.shouldWait) {
                return this.emitAndWait(event, data);
            } else {
                this.emit(event, data);
            }
        }.bind(this));
    }
});

module.exports = Runner;
