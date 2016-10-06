'use strict';

const NewScreenUpdater = require('lib/state-processor/capture-processor/screen-updater/new-screen-updater');
const Promise = require('bluebird');
const fs = require('q-io/fs');
const Image = require('lib/image');

describe('new-screen-updater', () => {
    const sandbox = sinon.sandbox.create();
    let imageStub;

    beforeEach(() => {
        sandbox.stub(fs);
        fs.makeTree.returns(Promise.resolve());

        imageStub = sinon.createStubInstance(Image);
        imageStub.save.returns(Promise.resolve());
    });

    afterEach(() => {
        sandbox.restore();
    });

    function exec_(opts) {
        opts = opts || {
            refPath: '/non/relevant.png'
        };
        const updater = new NewScreenUpdater(),
            capture = {
                image: imageStub
            },
            env = {
                refPath: opts.refPath
            };

        capture.image.save.returns(Promise.resolve());

        return updater.exec(capture, env);
    }

    it('should make directory before saving the image', () => {
        const mediator = sinon.spy().named('mediator');
        fs.exists.returns(Promise.resolve(false));
        fs.makeTree.returns(Promise.delay(50).then(mediator));

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
        fs.exists.returns(Promise.resolve(false));

        return exec_({refPath: '/some/path'})
            .then(() => {
                assert.calledWith(imageStub.save, '/some/path');
            });
    });

    it('should not save image if it already exists', () => {
        fs.exists.returns(Promise.resolve(true));

        return exec_()
            .then(() => {
                assert.notCalled(imageStub.save);
            });
    });

    it('should save image with correct path', () => {
        fs.exists.returns(Promise.resolve(false));

        return exec_({refPath: '/ref/path'})
            .then(() => {
                assert.calledWith(imageStub.save, '/ref/path');
            });
    });
});
