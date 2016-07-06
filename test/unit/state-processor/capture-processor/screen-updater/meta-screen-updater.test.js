'use strict';

const q = require('q');
const MetaScreenUpdater = require('../../../../../lib/state-processor/capture-processor/screen-updater/meta-screen-updater');
const temp = require('../../../../../lib/temp');
const fs = require('q-io/fs');
const Image = require('../../../../../lib/image');

describe('meta-screen-updater', () => {
    const sandbox = sinon.sandbox.create();
    let imageStub;

    function exec_(opts) {
        opts = opts || {};
        const updater = new MetaScreenUpdater(),
            capture = {
                image: imageStub
            },
            env = {
                refPath: opts.refPath
            };

        capture.image.save.returns(q());

        return updater.exec(capture, env);
    }

    beforeEach(() => {
        sandbox.stub(fs);
        sandbox.stub(temp);
        sandbox.stub(Image, 'compare').returns(q());

        imageStub = sinon.createStubInstance(Image);
        imageStub.save.returns(q());

        fs.exists.returns(q(true));
        fs.makeTree.returns(q());
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should check file to exist once', () => {
        return exec_()
            .then(() => {
                assert.calledOnce(fs.exists);
            });
    });

    it('should save temp image if reference image exists', () => {
        fs.exists.returns(q(true));
        temp.path.returns('/temp/path');

        return exec_()
            .then(() => {
                assert.calledOnce(imageStub.save);
                assert.calledWith(imageStub.save, '/temp/path');
            });
    });

    it('should save new reference if it does not exist', () => {
        fs.exists.returns(q(false));

        return exec_({refPath: '/ref/path'})
            .then(() => {
                assert.calledOnce(imageStub.save);
                assert.calledWith(imageStub.save, '/ref/path');
            });
    });
});
