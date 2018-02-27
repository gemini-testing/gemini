'use strict';

const {clientBridge: coreClientBridge} = require('gemini-core');
const ClientBridge = require('lib/browser/client-bridge');
const ClientBridgeDecorator = require('lib/browser/client-bridge/client-bridge-decorator');

describe('ClientBridge', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(coreClientBridge, 'build').resolves();
        sandbox.stub(ClientBridgeDecorator, 'create');
    });

    afterEach(() => sandbox.restore());

    describe('build', () => {
        it('should build client bridge', () => {
            return ClientBridge.build('foo bar', {foo: 'bar'})
                .then(() => assert.calledOnceWith(coreClientBridge.build, 'foo bar', {foo: 'bar'}));
        });

        it('should return client bridge decorator', () => {
            coreClientBridge.build.resolves({foo: 'bar'});
            ClientBridgeDecorator.create.withArgs({foo: 'bar'}).returns({baz: 'qux'});

            return assert.becomes(ClientBridge.build(), {baz: 'qux'});
        });
    });
});
