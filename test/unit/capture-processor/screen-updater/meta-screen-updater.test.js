'use strict';

var q = require('q'),
    QEmitter = require('qemitter'),
    MetaScreenUpdater = require('../../../../lib/capture-processor/screen-updater/meta-screen-updater'),
    CaptureProcessor = require('../../../../lib/capture-processor/capture-processor'),
    ImageProcessor = require('../../../../lib/image-processor'),
    fs = require('q-io/fs'),
    temp = require('temp'),
    util = require('./util');

describe('meta-screen-updater', function() {
    var sandbox = sinon.sandbox.create(),
        capture;

    function processCapture() {
        var updater = new MetaScreenUpdater();

        return updater.prepare(new QEmitter())
            .then(function() {
                return updater.processCapture(capture);
            });
    }

    beforeEach(function() {
        sandbox.stub(fs);
        sandbox.stub(temp);
        sandbox.stub(ImageProcessor.prototype);
        sandbox.stub(CaptureProcessor.prototype);
        capture = util.makeCaptureStub();

        capture.image.save.returns(q.resolve());
        fs.exists.returns(q.resolve(true));
        fs.makeTree.returns(q.resolve());
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should request state data once', function() {
        ImageProcessor.prototype.compare.returns(q());

        return processCapture()
            .then(function() {
                assert.calledOnce(CaptureProcessor.prototype.getStateData);
            });
    });

    it('should check file to exist once', function() {
        ImageProcessor.prototype.compare.returns(q());

        return processCapture()
            .then(function() {
                assert.calledOnce(fs.exists);
            });
    });

    it('should save temp image if reference image exists', function() {
        ImageProcessor.prototype.compare.returns(q());
        fs.exists.returns(q.resolve(true));
        temp.path.returns('/temp/path');

        return processCapture()
            .then(function() {
                assert.calledOnce(capture.image.save);
                assert.calledWith(capture.image.save, '/temp/path');
            });
    });

    it('should save new reference if it does not exist', function() {
        capture.browser.config.getScreenshotPath.returns('/ref/path');
        fs.exists.returns(q.resolve(false));

        return processCapture()
            .then(function() {
                assert.calledOnce(capture.image.save);
                assert.calledWith(capture.image.save, '/ref/path');
            });
    });
});
