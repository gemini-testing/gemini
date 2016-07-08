'use strict';
var createSuite = require('lib/suite').create,
    SuiteMonitor = require('lib/suite-monitor');

describe('suite-monitor', function() {
    beforeEach(function() {
        this.sinon = sinon.sandbox.create();

        this.root = createSuite('root');
        this.suite = createSuite('suite', this.root);

        this.monitor = new SuiteMonitor();
    });

    afterEach(function() {
        this.sinon.restore();
    });

    describe('suiteFinished', function() {
        it('should emit `endSuite` event when passed suite does not have nested suits', function() {
            var spy = this.sinon.spy().named('onEndSuite');
            this.monitor.on('endSuite', spy);
            this.monitor.suiteFinished(this.suite, 'browser');
            assert.calledOnce(spy);
        });

        it('should not emit `endSuite` event when passed suite has incomplete nested suits', function() {
            var spy = this.sinon.spy().named('onEndSuite');
            this.monitor.on('endSuite', spy);
            this.monitor.suiteFinished(this.root, 'browser');
            assert.neverCalledWith(spy);
        });

        it('should emit `endSuite` event when passed suite has complete nested suits', function() {
            var spy = this.sinon.spy().named('onEndSuite');
            this.child = createSuite('child', this.suite);
            this.monitor.on('endSuite', spy);
            this.monitor.suiteFinished(this.root, 'browser');
            this.monitor.suiteFinished(this.suite, 'browser');
            this.monitor.suiteFinished(this.child, 'browser');
            assert.callOrder(
                spy.withArgs(sinon.match({suite: this.child, browserId: 'browser'})),
                spy.withArgs(sinon.match({suite: this.suite, browserId: 'browser'})),
                spy.withArgs(sinon.match({suite: this.root, browserId: 'browser'}))
            );
        });
    });
});
