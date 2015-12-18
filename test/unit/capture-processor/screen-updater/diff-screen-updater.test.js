'use strict';

var q = require('q'),
    _ = require('lodash'),
    QEmitter = require('qemitter'),
    DiffScreenUpdater = require('../../../../lib/capture-processor/screen-updater/diff-screen-updater'),
    ImageProcessor = require('../../../../lib/image-processor'),
    fs = require('q-io/fs'),
    temp = require('temp'),
    util = require('./util');

describe('diff-screen-updater', function() {
    var sandbox = sinon.sandbox.create(),
        capture;

    function makeUpdater(opts) {
        opts = _.defaults(opts || {}, {
            tempDir: '/default/temp/dir'
        });
        return new DiffScreenUpdater({}, {tempDir: opts.tempDir});
    }

    function processCapture(updater) {
        updater = updater || makeUpdater();

        return updater.prepare(new QEmitter())
            .then(function() {
                return updater.processCapture(capture);
            });
    }

    beforeEach(function() {
        sandbox.stub(fs);
        sandbox.stub(temp);
        sandbox.stub(ImageProcessor.prototype);
        capture = util.makeCaptureStub();

        capture.image.save.returns(q.resolve());
        fs.exists.returns(q.resolve(true));
        fs.makeTree.returns(q.resolve());
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should prepare temp directory for images', function() {
        var updater = makeUpdater({tempDir: '/temp/path'});

        return updater.prepare(new QEmitter())
            .then(function() {
                assert.calledWith(fs.makeTree, '/temp/path');
            });
    });

    it('should save image to the temp directory before comparing', function() {
        ImageProcessor.prototype.compare.returns(q());
        temp.path.returns('/temp/path');

        return processCapture()
            .then(function() {
                assert.calledWith(capture.image.save, '/temp/path');
            });
    });

    it('should not compare images if reference image does not exist', function() {
        fs.exists.returns(q.resolve(false));

        return processCapture()
            .then(function() {
                assert.notCalled(ImageProcessor.prototype.compare);
            });
    });

    it('should not save image if images are the same', function() {
        ImageProcessor.prototype.compare.returns(q.resolve(true));

        return processCapture()
            .then(function() {
                assert.notCalled(fs.copy);
            });
    });

    it('should save image if images are different', function() {
        ImageProcessor.prototype.compare.returns(q.resolve(false));
        temp.path.returns('/temp/path');
        capture.browser.config.getScreenshotPath.returns('/ref/path');

        return processCapture()
            .then(function() {
                assert.calledWith(fs.copy, '/temp/path', '/ref/path');
            });
    });

    it('should save image with correct path', function() {
        var updater = makeUpdater({tempDir: '/temp/path'});

        ImageProcessor.prototype.compare.returns(q.resolve(false));

        return processCapture(updater)
            .then(function() {
                assert.calledWith(temp.path, {dir: '/temp/path', suffix: '.png'});
            });
    });
});
