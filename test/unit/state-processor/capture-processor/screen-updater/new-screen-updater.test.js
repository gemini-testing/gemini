'use strict';

const NewScreenUpdater = require('lib/state-processor/capture-processor/screen-updater/new-screen-updater');
const q = require('q');
const fs = require('q-io/fs');
const Image = require('lib/image');

describe('new-screen-updater', () => {
    const sandbox = sinon.sandbox.create();
    let imageStub;

    beforeEach(() => {
        sandbox.stub(fs);
        fs.makeTree.returns(q());

        imageStub = sinon.createStubInstance(Image);
        imageStub.save.returns(q());
    });

    afterEach(() => {
        sandbox.restore();
    });

    function exec_(opts) {
        opts = opts || {};
        const updater = new NewScreenUpdater(),
            capture = {
                image: imageStub
            },
            env = {
                refPath: opts.refPath
            };

        capture.image.save.returns(q());

        return updater.exec(capture, env);
    }

    it('should make directory before saving the image', () => {
        const mediator = sinon.spy().named('mediator');
        fs.exists.returns(q(false));
        fs.makeTree.returns(q.delay(1).then(mediator));

        return exec_()
            .then(() => {
                assert.callOrder(
                    fs.makeTree,
                    mediator,
                    imageStub.save
                );
            });
    });

    it('should save new image if it does not exists', () => {
        fs.exists.returns(q(false));

        return exec_({refPath: '/some/path'})
            .then(() => {
                assert.calledWith(imageStub.save, '/some/path');
            });
    });

    it('should not save image if it already exists', () => {
        fs.exists.returns(q(true));

        return exec_()
            .then(() => {
                assert.notCalled(imageStub.save);
            });
    });

    it('should save image with correct path', () => {
        fs.exists.returns(q(false));

        return exec_({refPath: '/ref/path'})
            .then(() => {
                assert.calledWith(imageStub.save, '/ref/path');
            });
    });
});
