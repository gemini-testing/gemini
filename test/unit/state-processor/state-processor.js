'use strict';

var StateProcessor = require('../../../lib/state-processor/state-processor'),
    CaptureProcessor = require('../../../lib/state-processor/capture-processor/capture-processor'),
    CaptureSession = require('../../../lib/capture-session'),
    util = require('../../util'),
    q = require('q'),
    _ = require('lodash');

describe('state-processor/state-processor', function() {
    var sandbox = sinon.sandbox.create(),
        captureProcessor,
        stateProcessor;

    beforeEach(function() {
        captureProcessor = sinon.createStubInstance(CaptureProcessor);
        captureProcessor.exec.returns(q({}));

        stateProcessor = new StateProcessor(captureProcessor);
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should passthrough getProcessedCaptureEventName call to capture processor', function() {
        stateProcessor.getProcessedCaptureEventName();

        assert.calledOnce(captureProcessor.getProcessedCaptureEventName);
    });

    describe('exec', function() {
        var browserSession;

        beforeEach(function() {
            browserSession = sinon.createStubInstance(CaptureSession);
            browserSession.capture.returns(q({}));
            _.set(browserSession, 'browser.config', {
                getScreenshotPath: sinon.stub()
            });
        });

        function exec_(opts) {
            opts = opts || {};
            return stateProcessor.exec(
                opts.state || util.makeStateStub(),
                browserSession,
                opts.captureOpts || {}
            );
        }

        it('should capture screenshot', function() {
            var state = util.makeStateStub(),
                pageDisposition = {
                    captureArea: {}
                };

            return stateProcessor.exec(state, browserSession, pageDisposition)
                .then(function() {
                    assert.calledOnce(browserSession.capture);
                    assert.calledWith(browserSession.capture, pageDisposition);
                });
        });

        it('should process captured screenshot', function() {
            var capture = {some: 'capture'};
            browserSession.capture.returns(q(capture));

            return exec_()
                .then(function() {
                    assert.calledOnce(captureProcessor.exec);
                    assert.calledWith(captureProcessor.exec, capture);
                });
        });

        it('should use browser config options in processing', function() {
            var state = util.makeStateStub();

            browserSession.browser.config.getScreenshotPath.returns('/some/path');
            browserSession.browser.config.tolerance = 100500;

            return exec_({state: state})
                .then(function() {
                    assert.calledWith(captureProcessor.exec, sinon.match.any, {
                        refPath: '/some/path',
                        tolerance: 100500
                    });
                });
        });

        it('should use state tolerance if it set', function() {
            var state = util.makeStateStub();
            state.tolerance = 1;

            browserSession.browser.config.tolerance = 100500;

            return exec_({state: state})
                .then(function() {
                    assert.calledWithMatch(captureProcessor.exec, sinon.match.any, {
                        tolerance: 1
                    });
                });
        });

        it('should use state tolerance even if it set to 0', function() {
            var state = util.makeStateStub();
            state.tolerance = 0;

            browserSession.browser.config.tolerance = 100500;

            return exec_({state: state})
                .then(function() {
                    assert.calledWithMatch(captureProcessor.exec, sinon.match.any, {
                        tolerance: 0
                    });
                });
        });

        it('should extend processed result with capture coverage', function() {
            var processedResult = {
                    some: 'data'
                },
                capture = {
                    coverage: 'some-coverage'
                };

            browserSession.capture.returns(q(capture));
            captureProcessor.exec.returns(q(processedResult));

            return exec_()
                .then(function(result) {
                    assert.deepEqual(result, {
                        some: 'data',
                        coverage: 'some-coverage'
                    });
                });
        });
    });
});
