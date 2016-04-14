'use strict';

var CaptureSession = require('../../../lib/capture-session'),
    util = require('../../util'),
    proxyquire = require('proxyquire'),
    _ = require('lodash');

describe('state-processor/state-processor', function() {
    var job = sinon.stub(),
        StateProcessor = proxyquire('../../../lib/state-processor/state-processor', {
            './job': job
        });

    afterEach(function() {
        job.reset();
    });

    describe('exec', function() {
        var browserSession;

        beforeEach(function() {
            browserSession = sinon.createStubInstance(CaptureSession);
            _.set(browserSession, 'browser.config', {
                getScreenshotPath: sinon.stub()
            });
        });

        function exec_(opts) {
            opts = opts || {};
            opts.captureProcessorInfo = opts.captureProcessorInfo || {};

            new StateProcessor(opts.captureProcessorInfo)
                .exec(
                    opts.state || util.makeStateStub(),
                    browserSession,
                    opts.pageDisposition || {}
                );
        }

        it('should perform job', function() {
            exec_({
                pageDisposition: {some: 'data'},
                captureProcessorInfo: {
                    module: '/some/module',
                    constructorArg: {some: 'arg'}
                }
            });

            assert.calledOnce(job);
            assert.calledWithMatch(job, {
                browserSession: browserSession.serialize(),
                captureProcessorInfo: {
                    module: '/some/module',
                    constructorArg: {some: 'arg'}
                },
                pageDisposition: {some: 'data'}
            });
        });

        it('should use browser config options in processing', function() {
            var state = util.makeStateStub();

            browserSession.browser.config.getScreenshotPath.returns('/some/path');
            browserSession.browser.config.tolerance = 100500;

            exec_({state: state});

            assert.calledWithMatch(job, {
                execOpts: {
                    refPath: '/some/path',
                    tolerance: 100500
                }
            });
        });

        it('should use state tolerance if it set', function() {
            var state = util.makeStateStub();
            state.tolerance = 1;

            browserSession.browser.config.tolerance = 100500;

            exec_({state: state});

            assert.calledWithMatch(job, {
                execOpts: {
                    tolerance: 1
                }
            });
        });

        it('should use state tolerance even if it set to 0', function() {
            var state = util.makeStateStub();
            state.tolerance = 0;

            browserSession.browser.config.tolerance = 100500;

            exec_({state: state});

            assert.calledWithMatch(job, {
                execOpts: {
                    tolerance: 0
                }
            });
        });
    });
});
