'use strict';
var q = require('q'),
    BrowserRunner = require('../../../lib/runner/browser-runner'),
    SuiteRunner = require('../../../lib/runner/suite-runner'),
    pool = require('../../../lib/browser-pool'),
    Pool = require('../../../lib/browser-pool/pool'),
    Config = require('../../../lib/config'),
    MetaError = require('../../../lib/errors/meta-error'),

    makekSuiteStub = require('../../util').makeSuiteStub;

describe('runner/BrowserRunner', function() {
    var sandbox = sinon.sandbox.create(),
        config,
        browserPool;

    beforeEach(function() {
        sandbox.stub(pool, 'create');
        sandbox.stub(SuiteRunner.prototype);
        config = sinon.createStubInstance(Config);
        browserPool = sinon.createStubInstance(Pool);

        SuiteRunner.prototype.run.returns(q.resolve());
    });

    afterEach(function() {
        sandbox.restore();
    });

    function mkRunner_(browser) {
        return BrowserRunner.create(browser || 'default-browser', config, browserPool);
    }

    describe('run', function() {
        beforeEach(function() {
            config.forBrowser.returns({retry: 0});
            browserPool.getBrowser.returns(q.resolve());
            browserPool.finalizeBrowsers.returns(q.resolve());
        });

        it('should emit `startBrowser` event when starting browser', function() {
            var onStartBrowser = sinon.spy().named('onStartBrowser'),
                runner = mkRunner_('browser');
            runner.on('startBrowser', onStartBrowser);

            return runner.run([])
                .then(function() {
                    assert.calledWith(onStartBrowser, {browserId: 'browser'});
                });
        });

        it('should get only browser associated wit runner', function() {
            var suites = [
                    makekSuiteStub({browsers: ['browser1', 'browser2']}),
                    makekSuiteStub({browsers: ['browser2']})
                ];

            var runner = mkRunner_('browser1');

            return runner.run(suites)
                .then(function() {
                    assert.calledOnce(browserPool.getBrowser);
                    assert.calledWith(browserPool.getBrowser, 'browser1');
                });
        });

        it('should get new browser for each suite', function() {
            var suites = [
                    makekSuiteStub({browsers: ['browser']}),
                    makekSuiteStub({browsers: ['browser']})
                ];

            var runner = mkRunner_('browser');

            return runner.run(suites)
                .then(function() {
                    assert.calledTwice(browserPool.getBrowser);
                    assert.alwaysCalledWith(browserPool.getBrowser, 'browser');
                });
        });

        it('should run only suites expected to be run in current browser', function() {
            var someSuite = makekSuiteStub({browsers: ['browser1', 'browser2']}),
                suites = [
                    someSuite,
                    makekSuiteStub({browsers: ['browser2']})
                ];

            var runner = mkRunner_('browser1');

            return runner.run(suites)
                .then(function() {
                    assert.calledOnce(SuiteRunner.prototype.run);
                    assert.calledWith(SuiteRunner.prototype.run, someSuite);
                });
        });

        it('should not run suites after cancel', function() {
            var runner = mkRunner_('browser'),
                suites = [
                    {browsers: ['browser']}
                ];
            runner.cancel();

            return runner.run(suites)
                .then(function() {
                    assert.notCalled(SuiteRunner.prototype.run);
                });
        });

        it('should cancel suite runners on cancel', function() {
            var runner = mkRunner_('browser'),
                suites = [
                    makekSuiteStub({browsers: ['browser']}),
                    makekSuiteStub({browsers: ['browser']})
                ];

            return runner.run(suites)
                .then(function() {
                    runner.cancel();

                    assert.calledTwice(SuiteRunner.prototype.cancel);
                });
        });

        it('should free browser after cancel', function() {
            var runner = mkRunner_('browser'),
                suites = [
                    makekSuiteStub({browsers: ['browser']})
                ];
            runner.cancel();

            return runner.run(suites)
                .then(function() {
                    assert.calledOnce(browserPool.freeBrowser);
                });
        });

        it('should emit `stopBrowser` after all suites', function() {
            var onStopBrowser = sinon.spy().named('onStopBrowser'),
                runner = mkRunner_('browser');
            runner.on('startBrowser', onStopBrowser);

            return runner.run([])
                .then(function() {
                    assert.calledWith(onStopBrowser, {browserId: 'browser'});
                });
        });

        it('should not emit `criticalError` if error is an instance of MetaError', function() {
            var onCriticalError = sinon.spy().named('onCriticalError'),
                suites = [
                    {browsers: ['browser']}
                ],
                runner = mkRunner_('browser');

            runner.on('criticalError', onCriticalError);
            browserPool.finalizeBrowsers.returns(q.reject(new MetaError('meta-error')));

            return runner.run(suites)
                .then(function() {
                    assert.notCalled(onCriticalError);
                });
        });

        it('should emit events in correct order', function() {
            var startBrowser = sinon.spy().named('onStartBrowser'),
                stopBrowser = sinon.spy().named('onStopBrowser'),
                suites = [
                    makekSuiteStub({browsers: ['browser']})
                ];

            var runner = mkRunner_('browser');
            runner.on('startBrowser', startBrowser);
            runner.on('stopBrowser', stopBrowser);

            return runner.run(suites)
                .then(function() {
                    assert.callOrder(
                        startBrowser,
                        SuiteRunner.prototype.run,
                        stopBrowser
                    );
                });
        });
    });

    describe('critical error', function() {
        beforeEach(function() {
            browserPool.getBrowser.returns(q.resolve());
            browserPool.finalizeBrowsers.returns(q.resolve());
        });

        it('should emit `criticalError` event on error', function() {
            var onCriticalError = sinon.spy().named('onCriticalError'),
                suites = [
                    makekSuiteStub({browsers: ['browser']})
                ];

            var runner = mkRunner_('browser');
            runner.on('criticalError', onCriticalError);
            browserPool.getBrowser.onFirstCall().returns(q.reject(new Error('error')));

            return runner.run(suites)
                .then(function() {
                    assert.calledOnce(onCriticalError);
                });
        });

        it('should not emit `criticalError` if it was manually stopped', function() {
            var onCriticalError = sinon.spy().named('onCriticalError'),
                suites = [
                    makekSuiteStub()
                ],
                runner = mkRunner_();

            runner.on('criticalError', onCriticalError);
            browserPool.getBrowser.onFirstCall().returns(q.reject(new pool.CancelledError()));

            return runner.run(suites)
                .then(function() {
                    assert.notCalled(onCriticalError);
                });
        });

        it('should pass suite and browser id as critical error event data', function() {
            var onCriticalError = sinon.spy().named('onCriticalError'),
                suite = makekSuiteStub({browsers: ['browser']}),
                suites = [
                    suite
                ],
                runner = mkRunner_('browser');

            runner.on('criticalError', onCriticalError);
            browserPool.getBrowser.onFirstCall().returns(q.reject(new Error('error')));

            return runner.run(suites)
                .then(function() {
                    assert.calledWithMatch(onCriticalError, {
                        suite: suite,
                        browserId: 'browser'
                    });
                });
        });
    });
});
