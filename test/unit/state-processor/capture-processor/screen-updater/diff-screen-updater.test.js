'use strict';

var DiffScreenUpdater = require('../../../../../lib/state-processor/capture-processor/screen-updater/diff-screen-updater'),
    ImageProcessor = require('../../../../../lib/image-processor'),
    Image = require('../../../../../lib/image'),
    temp = require('../../../../../lib/temp'),
    q = require('q'),
    QEmitter = require('qemitter'),
    fs = require('q-io/fs');

describe('diff-screen-updater', function() {
    var sandbox = sinon.sandbox.create();

    function exec_(opts) {
        opts = opts || {};
        var updater = new DiffScreenUpdater(),
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
    });

    afterEach(function() {
        sandbox.restore();
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

    it('should save image with correct suffix', function() {
        ImageProcessor.prototype.compare.returns(q.resolve(false));

        return exec_()
            .then(function() {
                assert.calledWith(temp.path, {suffix: '.png'});
            });
    });
});
