'use strict';

const Promise = require('bluebird');
const MetaScreenUpdater = require('lib/state-processor/capture-processor/screen-updater/meta-screen-updater');
const temp = require('lib/temp');
const fs = require('fs-extra');
const Image = require('lib/image');

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

        capture.image.save.returns(Promise.resolve());

        return updater.exec(capture, env);
    }

    beforeEach(() => {
        sandbox.stub(fs);
        sandbox.stub(temp);
        sandbox.stub(Image, 'compare').returns(Promise.resolve());

        imageStub = sinon.createStubInstance(Image);
        imageStub.save.returns(Promise.resolve());

        fs.accessAsync.returns(Promise.resolve());
        fs.mkdirsAsync.returns(Promise.resolve());
        fs.copyAsync.returns(Promise.resolve());
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should check file to exist once', () => {
        return exec_()
            .then(() => {
                assert.calledOnce(fs.accessAsync);
            });
    });

    it('should save temp image if reference image exists', () => {
        fs.accessAsync.returns(Promise.resolve());
        temp.path.returns('/temp/path');

        return exec_()
            .then(() => {
                assert.calledOnce(imageStub.save);
                assert.calledWith(imageStub.save, '/temp/path');
            });
    });

    it('should save new reference if it does not exist', () => {
        fs.accessAsync.returns(Promise.reject());

        return exec_({refPath: '/ref/path'})
            .then(() => {
                assert.calledOnce(imageStub.save);
                assert.calledWith(imageStub.save, '/ref/path');
            });
    });
});
