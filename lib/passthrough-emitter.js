'use strict';

const _ = require('lodash'),
    QEmitter = require('qemitter');

module.exports = class PassthroughEmitter extends QEmitter {
    // Allow to pass only one argument with event
    emit(type, data) {
        return super.emit(type, data);
    }

    emitAndWait(type, data) {
        return super.emitAndWait(type, data, {shouldWait: true});
    }

    /**
     * Emit event emitted by emitter
     * @param {EventEmitter} emitter
     * @param {String|String[]} event or array of events to passthrough
     */
    passthroughEvent(emitter, event) {
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
};
