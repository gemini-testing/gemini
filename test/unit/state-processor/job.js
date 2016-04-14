'use strict';

var CaptureSession = require('../../../lib/capture-session'),
    CaptureProcessor = require('../../../lib/state-processor/capture-processor/capture-processor'),
    proxyquire = require('proxyquire').noCallThru(),
    q = require('q'),
    _ = require('lodash');

describe('state-processor/job', () => {
    var sandbox = sinon.sandbox.create(),
        CaptureProcessorStub,
        captureProcessor,
        browserSession;

    beforeEach(() => {
        captureProcessor = sinon.createStubInstance(CaptureProcessor);
        captureProcessor.exec.returns(q({}));

        CaptureProcessorStub = {
            create: sinon.stub().returns(captureProcessor)
        };

        browserSession = sinon.createStubInstance(CaptureSession);
        browserSession.capture.returns({});

        sandbox.stub(CaptureSession, 'fromObject').returns(q(browserSession));
    });

    afterEach(() => {
        sandbox.restore();
    });

    function execJob_(opts) {
        opts = _.defaults(opts || {}, {
            captureProcessorInfo: {
                module: '/path/to/some/module'
            }
        });

        var stubs = _.set({}, opts.captureProcessorInfo.module, CaptureProcessorStub),
            job = proxyquire('../../../lib/state-processor/job', stubs);

        return job(opts);
    }

    it('should create capture processor', function() {
        execJob_({
            captureProcessorInfo: {
                module: '/some/module',
                constructorArg: 'some-arg'
            }
        });

        assert.calledOnce(CaptureProcessorStub.create);
        assert.calledWith(CaptureProcessorStub.create, 'some-arg');
    });

    it('should capture screenshot', function() {
        var pageDisposition = {
                captureArea: {}
            };

        return execJob_({pageDisposition})
            .then(function() {
                assert.calledOnce(browserSession.capture);
                assert.calledWith(browserSession.capture, pageDisposition);
            });
    });

    it('should process captured screenshot', function() {
        var capture = {some: 'capture'};
        browserSession.capture.returns(q(capture));

        return execJob_()
            .then(function() {
                assert.calledOnce(captureProcessor.exec);
                assert.calledWith(captureProcessor.exec, capture);
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

        return execJob_()
            .then(function(result) {
                assert.deepEqual(result, {
                    some: 'data',
                    coverage: 'some-coverage'
                });
            });
    });
});
