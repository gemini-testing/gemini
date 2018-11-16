'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const Promise = require('bluebird');
const {temp, Image} = require('gemini-core');

const utils = require('lib/state-processor/capture-processor/utils');
const NoRefImageError = require('lib/errors/no-ref-image-error');
const CaptureProcessor = require('lib/state-processor/capture-processor/capture-processor');
const CaptureProcessorFactory = require('lib/state-processor/capture-processor');

describe('state-processor/capture-processor/capture-processor', () => {
    const sandbox = sinon.sandbox.create();

    const mkImage = (opts = {}) => {
        opts = _.defaults(opts, {size: {width: 100500, height: 500100}});

        return {
            compare: Image.compare,
            save: Image.prototype.save,
            getSize: sandbox.stub().returns(opts.size)
        };
    };

    const mkExecMethod = (processor) => {
        return (opts = {}, capture = {}) => {
            opts = _.defaults(opts, {refImg: {path: '/default/path', size: null}});
            capture = _.defaults(capture, {image: mkImage()});

            return processor.exec(capture, opts);
        };
    };

    let exec_;

    beforeEach(() => {
        sandbox.stub(fs, 'readFileSync');
        sandbox.stub(temp, 'path');
        sandbox.stub(utils, 'copyImg').resolves(true);
        sandbox.stub(utils, 'saveRef').resolves(true);
        sandbox.stub(utils, 'existsRef').resolves(true);
        sandbox.stub(Image, 'compare').resolves(true);
        sandbox.stub(Image.prototype, 'save').resolves();
        sandbox.stub(Image, 'fromBase64').returns(mkImage());
    });

    afterEach(() => sandbox.restore());

    describe('images comparator', () => {
        let someProcessor;

        beforeEach(() => {
            someProcessor = CaptureProcessor.create()
                .onEqual(sandbox.stub())
                .onDiff(sandbox.stub())
                .onReference(sandbox.stub())
                .onNoReference(sandbox.stub());

            exec_ = mkExecMethod(someProcessor);
        });

        it('should save current image to a temporary directory', () => {
            temp.path.withArgs({suffix: '.png'}).returns('/temp/path');

            return exec_()
                .then(() => assert.calledOnceWith(Image.prototype.save, '/temp/path'));
        });

        it('should check that a reference image exists before saving a current image', () => {
            const mediator = sinon.spy().named('mediator');

            utils.existsRef.callsFake(() => Promise.delay(1).then(mediator).then(() => true));

            return exec_()
                .then(() => assert.callOrder(utils.existsRef, mediator, Image.prototype.save));
        });

        it('should compare images with given set of parameters', () => {
            temp.path.withArgs({suffix: '.png'}).returns('/temp/path');

            const opts = {
                refImg: {path: '/ref/path', size: null},
                pixelRatio: 100500,
                tolerance: 200500,
                antialiasingTolerance: 300500
            };

            return exec_(opts, {canHaveCaret: false})
                .then(() => {
                    assert.calledOnceWith(Image.compare, '/temp/path', '/ref/path', {
                        canHaveCaret: false,
                        pixelRatio: 100500,
                        tolerance: 200500,
                        antialiasingTolerance: 300500
                    });
                });
        });

        it('should compare images only after a current image is saved', () => {
            const mediator = sinon.spy().named('mediator');

            Image.prototype.save.callsFake(() => Promise.delay(1).then(mediator));

            return exec_()
                .then(() => assert.callOrder(Image.prototype.save, mediator, Image.compare));
        });
    });

    describe('tester processor', () => {
        let tester;

        beforeEach(() => {
            tester = CaptureProcessorFactory.create('tester');
            exec_ = mkExecMethod(tester);
        });

        describe('reference image does not exist', () => {
            beforeEach(() => {
                utils.existsRef.withArgs('/non-existent/path').resolves(false);
            });

            it('should save current image to a temporary directory', () => {
                temp.path.withArgs({suffix: '.png'}).returns('/temp/path');

                return exec_({refImg: {path: '/non-existent/path', size: null}})
                    .catch(() => assert.calledOnceWith(Image.prototype.save, '/temp/path'));
            });

            it('should be rejected with "NoRefImageError"', () => {
                return assert.isRejected(exec_({refImg: {path: '/non-existent/path', size: null}}), NoRefImageError);
            });

            it('should pass reference and current images to "NoRefImageError"', () => {
                temp.path.withArgs({suffix: '.png'}).returns('/temp/path');
                const currImage = mkImage({size: {width: 100, height: 200}});

                return exec_({refImg: {path: '/non-existent/path', size: null}}, {image: currImage})
                    .catch((err) => {
                        assert.deepEqual(err.refImg, {path: '/non-existent/path', size: null});
                        assert.deepEqual(err.currImg, {path: '/temp/path', size: {width: 100, height: 200}});
                    });
            });
        });

        describe('should return image comparison result if images are', () => {
            it('equal', () => {
                temp.path.withArgs({suffix: '.png'}).returns('/temp/path');
                fs.readFileSync.withArgs('/ref/path').returns('ref-buffer-data');

                const refImage = mkImage({size: {width: 100, height: 200}});
                Image.fromBase64.withArgs('ref-buffer-data').returns(refImage);

                const currImage = mkImage({size: {width: 100, height: 200}});

                return exec_({refImg: {path: '/ref/path', size: null}}, {image: currImage})
                    .then((result) => {
                        assert.deepEqual(result, {
                            refImg: {path: '/ref/path', size: {width: 100, height: 200}},
                            currImg: {path: '/temp/path', size: {width: 100, height: 200}},
                            equal: true
                        });
                    });
            });

            it('different', () => {
                Image.compare.resolves(false);
                temp.path.withArgs({suffix: '.png'}).returns('/temp/path');
                fs.readFileSync.withArgs('/ref/path').returns('ref-buffer-data');

                const refImage = mkImage({size: {width: 100, height: 200}});
                Image.fromBase64.withArgs('ref-buffer-data').returns(refImage);

                const currImage = mkImage({size: {width: 300, height: 400}});

                return exec_({refImg: {path: '/ref/path', size: null}}, {image: currImage})
                    .then((result) => {
                        assert.deepEqual(result, {
                            refImg: {path: '/ref/path', size: {width: 100, height: 200}},
                            currImg: {path: '/temp/path', size: {width: 300, height: 400}},
                            equal: false
                        });
                    });
            });
        });
    });

    describe('new-updater processor', () => {
        let newUpdater;

        beforeEach(() => {
            newUpdater = CaptureProcessorFactory.create('new-updater');
            exec_ = mkExecMethod(newUpdater);
        });

        it('should not save a reference image if it is already exists', () => {
            fs.readFileSync.withArgs('/existent/path').returns('existent-buffer-data');

            const refImage = mkImage({size: {width: 100, height: 200}});
            Image.fromBase64.withArgs('existent-buffer-data').returns(refImage);

            return exec_({refImg: {path: '/existent/path', size: null}})
                .then((res) => {
                    assert.notCalled(utils.saveRef);
                    assert.deepEqual(res, {
                        refImg: {path: '/existent/path', size: {width: 100, height: 200}},
                        updated: false
                    });
                });
        });

        it('should save a reference image if it does not exist', () => {
            utils.existsRef.resolves(false);

            const currImage = mkImage({size: {width: 100, height: 200}});
            const capture = {image: currImage};

            return exec_({refImg: {path: '/ref/path', size: null}}, capture)
                .then((res) => {
                    assert.calledOnceWith(utils.saveRef, '/ref/path', capture);
                    assert.deepEqual(res, {
                        refImg: {path: '/ref/path', size: {width: 100, height: 200}},
                        updated: true
                    });
                });
        });
    });

    describe('diff-updater processor', () => {
        let diffUpdater;

        beforeEach(() => {
            diffUpdater = CaptureProcessorFactory.create('diff-updater');
            exec_ = mkExecMethod(diffUpdater);
        });

        it('should not update a reference image if it does not exist', () => {
            utils.existsRef.resolves(false);

            return exec_({refImg: {path: '/non-existent/path', size: null}})
                .then((res) => {
                    assert.notCalled(utils.copyImg);
                    assert.deepEqual(res, {
                        refImg: {path: '/non-existent/path', size: null},
                        updated: false
                    });
                });
        });
    });

    describe('meta-updater processor', () => {
        let metaUpdater;

        beforeEach(() => {
            metaUpdater = CaptureProcessorFactory.create('meta-updater');
            exec_ = mkExecMethod(metaUpdater);
        });

        it('should save a reference image if it does not exist', () => {
            utils.existsRef.resolves(false);

            const currImage = mkImage({size: {width: 100, height: 200}});
            const capture = {image: currImage};

            return exec_({refImg: {path: '/ref/path', size: null}}, capture)
                .then((res) => {
                    assert.calledOnceWith(utils.saveRef, '/ref/path', capture);
                    assert.deepEqual(res, {
                        refImg: {path: '/ref/path', size: {width: 100, height: 200}},
                        updated: true
                    });
                });
        });
    });

    ['diff-updater', 'meta-updater'].forEach((updaterType) => {
        describe(`${updaterType} processor`, () => {
            let updater;

            beforeEach(() => {
                updater = CaptureProcessorFactory.create(updaterType);
                exec_ = mkExecMethod(updater);
            });

            it('should not update a reference image if images are the same', () => {
                fs.readFileSync.withArgs('/ref/path').returns('ref-buffer-data');

                const refImage = mkImage({size: {width: 100, height: 200}});
                Image.fromBase64.withArgs('ref-buffer-data').returns(refImage);

                return exec_({refImg: {path: '/ref/path', size: null}})
                    .then((res) => {
                        assert.notCalled(utils.copyImg);
                        assert.deepEqual(res, {
                            refImg: {path: '/ref/path', size: {width: 100, height: 200}},
                            updated: false
                        });
                    });
            });

            describe('if images are different', () => {
                beforeEach(() => {
                    Image.compare.resolves(false);
                    temp.path.withArgs({suffix: '.png'}).returns('/temp/path');
                });

                it('should update a reference image', () => {
                    return exec_({refImg: {path: '/ref/path', size: null}})
                        .then(() => assert.calledOnceWith(utils.copyImg, '/temp/path', '/ref/path'));
                });

                it('should update a reference image size', () => {
                    fs.readFileSync.withArgs('/ref/path').returns('ref-buffer-data');
                    const refImage = mkImage({size: {width: 100, height: 200}});
                    Image.fromBase64.withArgs('ref-buffer-data').returns(refImage);

                    const currImage = mkImage({size: {width: 300, height: 400}});

                    return exec_({refImg: {path: '/ref/path', size: null}}, {image: currImage})
                        .then((res) => {
                            assert.deepEqual(res, {
                                refImg: {path: '/ref/path', size: {width: 300, height: 400}},
                                updated: true
                            });
                        });
                });

                it('should not update reference image size if copying image fails', () => {
                    utils.copyImg.resolves(false);

                    fs.readFileSync.withArgs('/ref/path').returns('ref-buffer-data');
                    const refImage = mkImage({size: {width: 100, height: 200}});
                    Image.fromBase64.withArgs('ref-buffer-data').returns(refImage);

                    const currImage = mkImage({size: {width: 300, height: 400}});

                    return exec_({refImg: {path: '/ref/path', size: null}}, {image: currImage})
                        .then((res) => {
                            assert.deepEqual(res, {
                                refImg: {path: '/ref/path', size: {width: 100, height: 200}},
                                updated: false
                            });
                        });
                });
            });
        });
    });
});
