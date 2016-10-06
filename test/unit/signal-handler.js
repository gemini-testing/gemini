'use strict';

var signalHandler = require('lib/signal-handler');

describe.skip('signalHandler', function() {
    var sandbox = sinon.sandbox.create(),
        onExit;

    beforeEach(function() {
        onExit = sinon.spy();
        sandbox.stub(process, 'exit', () => {});
        signalHandler.on('exit', onExit);
    });

    afterEach(function() {
        sandbox.restore();
    });

    // Can't test SIGINT and SIGTERM because these signals will kill test process
    it('should send `exit` on SIGHUP, SIGINT and SIGTERM', function() {
        process.emit('SIGHUP');
        assert.calledOnce(onExit);
    });
});
