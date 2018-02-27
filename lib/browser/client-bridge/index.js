'use strict';

const {clientBridge} = require('gemini-core');
const ClientBridgeDecorator = require('./client-bridge-decorator');

exports.build = (browser, opts) => {
    return clientBridge.build(browser, opts)
        .then((clientBridge) => ClientBridgeDecorator.create(clientBridge));
};
