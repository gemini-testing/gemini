'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const Promise = require('bluebird');
const {Image} = require('gemini-core');

const utils = require('lib/state-processor/capture-processor/utils');

describe('state-processor/capture-processor/utils', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    describe('copyImg', () => {
        beforeEach(() => sandbox.stub(fs, 'copyAsync').returns(Promise.resolve()));

        it('should copy a current image to reference path', () => {
            return utils.copyImg('/temp/path', '/ref/path')
                .then(() => assert.calledOnceWith(fs.copyAsync, '/temp/path', '/ref/path'));
        });

        describe('should return', () => {
            it('"true" if a current image is copied successfully', () => {
                return utils.copyImg('/temp/path', '/ref/path')
                    .then((res) => assert.isTrue(res));
            });

            it('"false" if a current image was not copied', () => {
                fs.copyAsync.rejects();

                return utils.copyImg('/temp/path', '/ref/path')
                    .then((res) => assert.isFalse(res));
            });
        });
    });

    describe('saveRef', () => {
        const save_ = (opts) => {
            opts = _.defaults(opts || {}, {
                refPath: '/default/path'
            });

            return utils.saveRef(opts.refPath, _.set({}, 'image.save', Image.prototype.save));
        };

        beforeEach(() => {
            sandbox.stub(fs, 'mkdirsAsync').returns(Promise.resolve());
            sandbox.stub(Image.prototype, 'save').returns(Promise.resolve());
        });

        it('should make a directory before saving the image', () => {
            const mediator = sinon.spy().named('mediator');

            fs.mkdirsAsync.callsFake(() => Promise.delay(1).then(mediator));

            return save_()
                .then(() => assert.callOrder(fs.mkdirsAsync, mediator, Image.prototype.save));
        });

        it('should save an image with the given path', () => {
            return save_({refPath: '/ref/path'})
                .then(() => assert.calledOnceWith(Image.prototype.save, '/ref/path'));
        });

        describe('should return', () => {
            it('"true" if the directory is created and the image saved successfully', () => {
                return save_({refPath: '/ref/path'})
                    .then((res) => assert.isTrue(res));
            });

            it('"false" if the directory was not created', () => {
                fs.mkdirsAsync.rejects();

                return save_({refPath: '/ref/path'})
                    .then((res) => assert.isFalse(res));
            });

            it('"false" if the image was not saved', () => {
                Image.prototype.save.rejects();

                return save_({refPath: '/ref/path'})
                    .then((res) => assert.isFalse(res));
            });
        });
    });

    describe('existsRef', () => {
        beforeEach(() => sandbox.stub(fs, 'accessAsync').returns(Promise.resolve()));

        it('should check the reference image existence', () => {
            return utils.existsRef('/ref/path')
                .then(() => assert.calledOnceWith(fs.accessAsync, '/ref/path'));
        });

        describe('should return', () => {
            it('"true" if the reference image exists', () => {
                return utils.existsRef('/ref/path')
                    .then((res) => assert.isTrue(res));
            });

            it('"false" if the reference image does not exists', () => {
                fs.accessAsync.rejects();

                return utils.existsRef('/ref/path')
                    .then((res) => assert.isFalse(res));
            });
        });
    });
});
