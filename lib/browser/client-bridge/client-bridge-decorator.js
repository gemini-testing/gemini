'use strict';

const Promise = require('bluebird');
const {errors: {ClientBridgeError}} = require('gemini-core');
const StateError = require('../../errors/state-error');

module.exports = class ClientBridgeDecorator {
    static create(clientBridge) {
        return new ClientBridgeDecorator(clientBridge);
    }

    constructor(clientBridge) {
        this._clientBridge = clientBridge;
    }

    call(name, args) {
        return this._clientBridge.call(name, args)
            .catch((e) => {
                e = e instanceof ClientBridgeError ? new StateError(e.message) : e;

                return Promise.reject(e);
            });
    }
};
