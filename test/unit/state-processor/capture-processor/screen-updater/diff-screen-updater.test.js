'use strict';

const DiffScreenUpdater = require('lib/state-processor/capture-processor/screen-updater/diff-screen-updater');
const temp = require('lib/temp');
const Promise = require('bluebird');
const fs = require('fs-extra');
const Image = require('lib/image');

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

        capture.image.save.returns(Promise.resolve());

        return updater.exec(capture, env);
    }

    beforeEach(() => {
        sandbox.stub(fs);
        sandbox.stub(temp);

        imageStub = sinon.createStubInstance(Image);
        imageCompareStub = sandbox.stub(Image, 'compare');
        imageStub.save.returns(Promise.resolve());

        fs.accessAsync.returns(Promise.resolve());
        fs.copyAsync.returns(Promise.resolve());
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should save image to the temp directory before comparing', () => {
        imageCompareStub.returns(Promise.resolve());
        temp.path.returns('/temp/path');

        return exec_()
            .then(() => {
                assert.calledOnce(imageStub.save);
                assert.calledWith(imageStub.save, '/temp/path');
            });
    });

    it('should not compare images if reference image does not exist', () => {
        fs.accessAsync.returns(Promise.reject());
        imageCompareStub.returns(Promise.resolve());

        return exec_()
            .then(() => {
                assert.notCalled(Image.compare);
            });
    });

    it('should not save image if images are the same', () => {
        imageCompareStub.returns(Promise.resolve(true));

        return exec_()
            .then(() => {
                assert.notCalled(fs.copyAsync);
            });
    });

    it('should save image if images are different', () => {
        imageCompareStub.returns(Promise.resolve(false));
        temp.path.returns('/temp/path');

        return exec_({refPath: '/ref/path'})
            .then(() => {
                assert.calledWith(fs.copyAsync, '/temp/path', '/ref/path');
            });
    });

    it('should save image with correct suffix', () => {
        imageCompareStub.returns(Promise.resolve(false));

        return exec_()
            .then(() => {
                assert.calledWith(temp.path, {suffix: '.png'});
            });
    });
});
