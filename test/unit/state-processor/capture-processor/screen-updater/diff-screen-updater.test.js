'use strict';

var DiffScreenUpdater = require('../../../../../lib/state-processor/capture-processor/screen-updater/diff-screen-updater'),
    ImageProcessor = require('../../../../../lib/image-processor'),
    Image = require('../../../../../lib/image'),
    q = require('q'),
    _ = require('lodash'),
    QEmitter = require('qemitter'),
    fs = require('q-io/fs'),
    temp = require('temp');

describe('diff-screen-updater', function() {
    var sandbox = sinon.sandbox.create();

    function makeUpdater(opts) {
        opts = _.defaults(opts || {}, {
            tempDir: '/default/temp/dir'
        });
        return new DiffScreenUpdater({}, {tempDir: opts.tempDir});
    }

    function exec_(opts) {
        opts = opts || {};
        var updater = opts.updater || makeUpdater(),
            capture = {
                image: new Image()
            },
            env = {
                refPath: opts.refPath
            };

        return updater.prepare(new QEmitter())
            .then(function() {
                return updater.exec(capture, env);
            });
    }

    beforeEach(function() {
        sandbox.stub(fs);
        sandbox.stub(temp);
        sandbox.stub(ImageProcessor.prototype);

        sandbox.stub(Image.prototype);
        Image.prototype.save.returns(q());

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

        return exec_()
            .then(function() {
                assert.calledOnce(Image.prototype.save);
                assert.calledWith(Image.prototype.save, '/temp/path');
            });
    });

    it('should not compare images if reference image does not exist', function() {
        fs.exists.returns(q.resolve(false));

        return exec_()
            .then(function() {
                assert.notCalled(ImageProcessor.prototype.compare);
            });
    });

    it('should not save image if images are the same', function() {
        ImageProcessor.prototype.compare.returns(q.resolve(true));

        return exec_()
            .then(function() {
                assert.notCalled(fs.copy);
            });
    });

    it('should save image if images are different', function() {
        ImageProcessor.prototype.compare.returns(q.resolve(false));
        temp.path.returns('/temp/path');

        return exec_({refPath: '/ref/path'})
            .then(function() {
                assert.calledWith(fs.copy, '/temp/path', '/ref/path');
            });
    });

    it('should save image with correct path', function() {
        var updater = makeUpdater({tempDir: '/temp/path'});

        ImageProcessor.prototype.compare.returns(q.resolve(false));

        return exec_({updater: updater})
            .then(function() {
                assert.calledWith(temp.path, {dir: '/temp/path', suffix: '.png'});
            });
    });
});
