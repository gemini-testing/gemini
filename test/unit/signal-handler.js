'use strict';

var q = require('q'),
    signalHandler = require('../../lib/signal-handler');

describe('signalHandler', function() {
    var sandbox = sinon.sandbox.create(),
        defer, onExit;

    beforeEach(function() {
        defer = q.defer();
        onExit = sinon.spy();
        sandbox.stub(process, 'exit', defer.resolve.bind(defer));
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
