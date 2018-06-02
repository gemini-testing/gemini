'use strict';

const _ = require('lodash');
const AsyncEmitter = require('gemini-core').events.AsyncEmitter;

const ASYNC_FLAG = 'async';
const markAsAsync = (args) => !args.includes(ASYNC_FLAG) ? args.concat(ASYNC_FLAG) : args;

module.exports = class PassthroughEmitter extends AsyncEmitter {
    emitAndWait(type, ...args) {
        return super.emitAndWait(type, ...markAsAsync(args));
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

        emitter.on(event, function(...args) {
            if (args.includes(ASYNC_FLAG)) {
                return this.emitAndWait(event, ...args);
            } else {
                this.emit(event, ...args);
            }
        }.bind(this));
    }
};
