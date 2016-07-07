'use strict';

const DiffScreenUpdater = require('../../../../../lib/state-processor/capture-processor/screen-updater/diff-screen-updater');
const temp = require('../../../../../lib/temp');
const q = require('q');
const fs = require('q-io/fs');
const Image = require('../../../../../lib/image');

describe('diff-screen-updater', () => {
    const sandbox = sinon.sandbox.create();
    let imageStub;
    let imageCompareStub;

    function exec_(opts) {
        opts = opts || {};
        const updater = new DiffScreenUpdater(),
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

        imageStub = sinon.createStubInstance(Image);
        imageCompareStub = sandbox.stub(Image, 'compare');
        imageStub.save.returns(q());

        fs.exists.returns(q(true));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should save image to the temp directory before comparing', () => {
        imageCompareStub.returns(q());
        temp.path.returns('/temp/path');

        return exec_()
            .then(() => {
                assert.calledOnce(imageStub.save);
                assert.calledWith(imageStub.save, '/temp/path');
            });
    });

    it('should not compare images if reference image does not exist', () => {
        fs.exists.returns(q(false));
        imageCompareStub.returns(q());

        return exec_()
            .then(() => {
                assert.notCalled(Image.compare);
            });
    });

    it('should not save image if images are the same', () => {
        imageCompareStub.returns(q(true));

        return exec_()
            .then(() => {
                assert.notCalled(fs.copy);
            });
    });

    it('should save image if images are different', () => {
        imageCompareStub.returns(q(false));
        temp.path.returns('/temp/path');

        return exec_({refPath: '/ref/path'})
            .then(() => {
                assert.calledWith(fs.copy, '/temp/path', '/ref/path');
            });
    });

    it('should save image with correct suffix', () => {
        imageCompareStub.returns(q(false));

        return exec_()
            .then(() => {
                assert.calledWith(temp.path, {suffix: '.png'});
            });
    });
});
