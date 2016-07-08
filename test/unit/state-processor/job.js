'use strict';

var CaptureSession = require('lib/capture-session'),
    CaptureProcessor = require('lib/state-processor/capture-processor/capture-processor'),
    temp = require('lib/temp'),
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

        sandbox.stub(temp);
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
            job = proxyquire('lib/state-processor/job', stubs);

        return job(opts, _.noop);
    }

    it('should create capture processor', () => {
        execJob_({
            captureProcessorInfo: {
                module: '/some/module',
                constructorArg: 'some-arg'
            }
        });

        assert.calledOnce(CaptureProcessorStub.create);
        assert.calledWith(CaptureProcessorStub.create, 'some-arg');
    });

    it('should capture screenshot', () => {
        var page = {
                captureArea: {}
            };

        return execJob_({page})
            .then(() => {
                assert.calledOnce(browserSession.capture);
                assert.calledWith(browserSession.capture, page);
            });
    });

    it('should process captured screenshot', () => {
        var capture = {some: 'capture'};
        browserSession.capture.returns(q(capture));

        return execJob_()
            .then(() => {
                assert.calledOnce(captureProcessor.exec);
                assert.calledWith(captureProcessor.exec, capture);
            });
    });
});
