'use strict';

var NewScreenUpdater = require('../../../../../lib/state-processor/capture-processor/screen-updater/new-screen-updater'),
    Image = require('../../../../../lib/image'),
    q = require('q'),
    QEmitter = require('qemitter'),
    fs = require('q-io/fs');

describe('new-screen-updater', function() {
    var sandbox = sinon.sandbox.create();

    beforeEach(function() {
        sandbox.stub(fs);
        fs.makeTree.returns(q.resolve());
        sandbox.stub(Image.prototype);
        Image.prototype.save.returns(q());
    });

    afterEach(function() {
        sandbox.restore();
    });

    function exec_(opts) {
        opts = opts || {};
        var updater = new NewScreenUpdater(),
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

    it('should make directory before saving the image', function() {
        var mediator = sinon.spy().named('mediator');
        fs.exists.returns(q.resolve(false));
        fs.makeTree.returns(q.delay(1).then(mediator));

        return exec_()
            .then(function() {
                assert.callOrder(
                    fs.makeTree,
                    mediator,
                    Image.prototype.save
                );
            });
    });

    it('should save new image if it does not exists', function() {
        fs.exists.returns(q.resolve(false));

        return exec_({refPath: '/some/path'})
            .then(function() {
                assert.calledWith(Image.prototype.save, '/some/path');
            });
    });

    it('should not save image if it already exists', function() {
        fs.exists.returns(q.resolve(true));

        return exec_()
            .then(function() {
                assert.notCalled(Image.prototype.save);
            });
    });

    it('should save image with correct path', function() {
        fs.exists.returns(q.resolve(false));

        return exec_({refPath: '/ref/path'})
            .then(function() {
                assert.calledWith(Image.prototype.save, '/ref/path');
            });
    });
});
