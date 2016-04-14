'use strict';

var DiffScreenUpdater = require('../../../../../lib/state-processor/capture-processor/screen-updater/diff-screen-updater'),
    Image = require('../../../../../lib/image'),
    temp = require('../../../../../lib/temp'),
    q = require('q'),
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

        return updater.exec(capture, env);
    }

    beforeEach(function() {
        sandbox.stub(fs);
        sandbox.stub(temp);
        sandbox.stub(Image, 'compare');

        sandbox.stub(Image.prototype);
        Image.prototype.save.returns(q());

        fs.exists.returns(q.resolve(true));
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should save image to the temp directory before comparing', function() {
        Image.compare.returns(q());
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
                assert.notCalled(Image.compare);
            });
    });

    it('should not save image if images are the same', function() {
        Image.compare.returns(q.resolve(true));

        return exec_()
            .then(function() {
                assert.notCalled(fs.copy);
            });
    });

    it('should save image if images are different', function() {
        Image.compare.returns(q.resolve(false));
        temp.path.returns('/temp/path');

        return exec_({refPath: '/ref/path'})
            .then(function() {
                assert.calledWith(fs.copy, '/temp/path', '/ref/path');
            });
    });

    it('should save image with correct suffix', function() {
        Image.compare.returns(q.resolve(false));

        return exec_()
            .then(function() {
                assert.calledWith(temp.path, {suffix: '.png'});
            });
    });
});
