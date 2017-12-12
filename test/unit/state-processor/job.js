'use strict';

const CaptureSession = require('lib/capture-session');
const CaptureProcessor = require('lib/state-processor/capture-processor/capture-processor');
const {temp} = require('gemini-core');
const proxyquire = require('proxyquire').noCallThru();
const Promise = require('bluebird');
const _ = require('lodash');

describe('state-processor/job', () => {
    const sandbox = sinon.sandbox.create();

    let captureProcessor;
    let browserSession;

    const execJob_ = (opts) => {
        const job = proxyquire('lib/state-processor/job', {
            './capture-processor': CaptureProcessor
        });

        return job(opts || {}, _.noop);
    };

    beforeEach(() => {
        captureProcessor = sinon.createStubInstance(CaptureProcessor);
        sandbox.stub(CaptureProcessor, 'create').returns(captureProcessor);
        captureProcessor.exec.returns(Promise.resolve({}));

        browserSession = sinon.createStubInstance(CaptureSession);
        browserSession.capture.returns({});

        sandbox.stub(CaptureSession, 'fromObject').returns(Promise.resolve(browserSession));

        sandbox.stub(temp, 'attach');
    });

    afterEach(() => sandbox.restore());

    it('should create capture processor', () => {
        execJob_({captureProcessorType: 'some-type'});

        assert.calledOnceWith(CaptureProcessor.create, 'some-type');
    });

    it('should capture screenshot', () => {
        const page = {captureArea: {}};

        return execJob_({page})
            .then(() => assert.calledOnceWith(browserSession.capture, page));
    });

    it('should process captured screenshot', () => {
        const capture = {some: 'capture'};
        browserSession.capture.returns(Promise.resolve(capture));

        return execJob_({})
            .then(() => assert.calledOnceWith(captureProcessor.exec, capture));
    });
});
