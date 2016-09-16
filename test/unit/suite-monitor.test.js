'use strict';

const createSuite = require('lib/suite').create;
const SuiteMonitor = require('lib/suite-monitor');

describe('suite-monitor', () => {
    const sandbox = sinon.sandbox.create();
    let monitor;
    let root;
    let suite;

    beforeEach(() => {
        root = createSuite('root');
        suite = createSuite('suite', root);
        root.addChild(suite);

        monitor = new SuiteMonitor();
    });

    afterEach(() => sandbox.restore());

    describe('suiteFinished', () => {
        it('should emit `endSuite` event when passed suite does not have nested suits', () => {
            const spy = sandbox.spy().named('onEndSuite');
            monitor.on('endSuite', spy);

            monitor.suiteFinished(suite, 'browser');

            assert.calledOnce(spy);
        });

        it('should not emit `endSuite` event when passed suite has incomplete nested suits', () => {
            const spy = sandbox.spy().named('onEndSuite');
            monitor.on('endSuite', spy);

            monitor.suiteFinished(root, 'browser');

            assert.neverCalledWith(spy);
        });

        it('should emit `endSuite` event when passed suite has complete nested suits', () => {
            const spy = sandbox.spy().named('onEndSuite');
            const child = createSuite('child', suite);
            suite.addChild(child);
            monitor.on('endSuite', spy);

            monitor.suiteFinished(root, 'browser');
            monitor.suiteFinished(suite, 'browser');
            monitor.suiteFinished(child, 'browser');

            assert.callOrder(
                spy.withArgs(sinon.match({suite: child, browserId: 'browser'})),
                spy.withArgs(sinon.match({suite: suite, browserId: 'browser'})),
                spy.withArgs(sinon.match({suite: root, browserId: 'browser'}))
            );
        });
    });
});
