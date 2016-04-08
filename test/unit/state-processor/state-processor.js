'use strict';

var StateProcessor = require('../../../lib/state-processor/state-processor'),
    CaptureProcessor = require('../../../lib/state-processor/capture-processor/capture-processor'),
    Env = require('../../../lib/state-processor/env'),
    CaptureSession = require('../../../lib/capture-session'),
    util = require('../../util'),
    q = require('q');

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

    it('should passthrough prepare call to capture processor', function() {
        stateProcessor.prepare('some-emitter');

        assert.calledOnce(captureProcessor.prepare);
        assert.calledWith(captureProcessor.prepare, 'some-emitter');
    });

    describe('exec', function() {
        var browserSession;

        beforeEach(function() {
            browserSession = sinon.createStubInstance(CaptureSession);
            browserSession.capture.returns(q({}));
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

        it('should process capture with correct environment', function() {
            var state = util.makeStateStub();

            sandbox.stub(Env.prototype, '__constructor').returns({some: 'env'});

            return exec_({state: state})
                .then(function() {
                    assert.calledWith(Env.prototype.__constructor, state, browserSession);
                    assert.calledWith(captureProcessor.exec, sinon.match.any, {some: 'env'});
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
