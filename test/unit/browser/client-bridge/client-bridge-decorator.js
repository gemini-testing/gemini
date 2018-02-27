'use strict';

const ClientBridgeDecorator = require('lib/browser/client-bridge/client-bridge-decorator');
const {errors: {ClientBridgeError}} = require('gemini-core');
const StateError = require('lib/errors/state-error');

describe('ClientBridgeDecorator', () => {
    const stubClientBridge_ = () => ({call: sinon.stub().resolves()});

    it('should call the original "call" method', () => {
        const clientBridge = stubClientBridge_();
        const clientBridgeDecorator = ClientBridgeDecorator.create(clientBridge);

        clientBridge.call.withArgs('foo', 'bar').resolves('baz qux');

        return assert.becomes(clientBridgeDecorator.call('foo', 'bar'), 'baz qux');
    });

    it('should wrap "ClientBridge" error into "State" error', () => {
        const clientBridge = stubClientBridge_();
        const clientBridgeDecorator = ClientBridgeDecorator.create(clientBridge);

        clientBridge.call.rejects(new ClientBridgeError());

        return assert.isRejected(clientBridgeDecorator.call(), StateError);
    });

    it('should pass "ClientBridge" error message into "State" error', () => {
        const clientBridge = stubClientBridge_();
        const clientBridgeDecorator = ClientBridgeDecorator.create(clientBridge);

        clientBridge.call.rejects(new ClientBridgeError('foo bar'));

        return assert.isRejected(clientBridgeDecorator.call(), /foo bar/);
    });

    it('should passthrough not "ClientBridge" error message into "State" error', () => {
        const clientBridge = stubClientBridge_();
        const clientBridgeDecorator = ClientBridgeDecorator.create(clientBridge);

        clientBridge.call.rejects(new Error());

        return assert.isRejected(clientBridgeDecorator.call(), Error);
    });
});
