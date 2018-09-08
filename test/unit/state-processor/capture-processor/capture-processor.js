'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const {temp, Image} = require('gemini-core');

const utils = require('lib/state-processor/capture-processor/utils');
const NoRefImageError = require('lib/errors/no-ref-image-error');
const CaptureProcessor = require('lib/state-processor/capture-processor/capture-processor');
const CaptureProcessorFactory = require('lib/state-processor/capture-processor');

describe('state-processor/capture-processor/capture-processor', () => {
    const sandbox = sinon.sandbox.create();

    const mkExecMethod = (processor) => {
        return (opts, capture) => {
            opts = _.defaults(opts || {}, {
                referencePath: '/default/path'
            });

            capture = _.defaults(capture || {}, {
                image: {
                    save: Image.prototype.save,
                    compare: Image.compare
                }
            });

            return processor.exec(capture, opts);
        };
    };

    let exec_;

    beforeEach(() => {
        sandbox.stub(temp, 'path');
        sandbox.stub(utils, 'copyImg').resolves(true);
        sandbox.stub(utils, 'saveRef').resolves(true);
        sandbox.stub(utils, 'existsRef').resolves(true);
        sandbox.stub(Image, 'compare').resolves(true);
        sandbox.stub(Image.prototype, 'save').resolves();
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
                referencePath: '/ref/path',
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

                return exec_({referencePath: '/non-existent/path'})
                    .catch(() => assert.calledOnceWith(Image.prototype.save, '/temp/path'));
            });

            it('should be rejected with "NoRefImageError"', () => {
                return assert.isRejected(exec_({referencePath: '/non-existent/path'}), NoRefImageError);
            });

            it('should pass reference and current image paths to "NoRefImageError"', () => {
                temp.path.withArgs({suffix: '.png'}).returns('/temp/path');

                return exec_({referencePath: '/non-existent/path'})
                    .catch((err) => {
                        assert.equal(err.refImagePath, '/non-existent/path');
                        assert.equal(err.currentPath, '/temp/path');
                    });
            });
        });

        describe('should return image comparison result if images are', () => {
            it('equal', () => {
                temp.path.withArgs({suffix: '.png'}).returns('/temp/path');

                return exec_({referencePath: '/ref/path'})
                    .then((result) => {
                        assert.deepEqual(result, {
                            currentPath: '/temp/path',
                            referencePath: '/ref/path',
                            equal: true
                        });
                    });
            });

            it('different', () => {
                Image.compare.resolves(false);
                temp.path.withArgs({suffix: '.png'}).returns('/temp/path');

                return exec_({referencePath: '/ref/path'})
                    .then((result) => {
                        assert.deepEqual(result, {
                            currentPath: '/temp/path',
                            referencePath: '/ref/path',
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
            return exec_({referencePath: '/existent/path'})
                .then((res) => {
                    assert.notCalled(utils.saveRef);
                    assert.deepEqual(res, {
                        imagePath: '/existent/path',
                        updated: false
                    });
                });
        });

        it('should save a reference image if it does not exist', () => {
            utils.existsRef.resolves(false);

            const capture = _.set({}, 'image.save', Image.prototype.save);

            return exec_({referencePath: '/ref/path'}, capture)
                .then((res) => {
                    assert.calledOnceWith(utils.saveRef, '/ref/path', capture);
                    assert.deepEqual(res, {
                        imagePath: '/ref/path',
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

        describe('should not update a reference image', () => {
            it('if it does not exist', () => {
                utils.existsRef.resolves(false);

                return exec_({referencePath: '/non-existent/path'})
                    .then((res) => {
                        assert.notCalled(utils.copyImg);
                        assert.deepEqual(res, {
                            imagePath: '/non-existent/path',
                            updated: false
                        });
                    });
            });

            it('if images are the same', () => {
                return exec_({referencePath: '/ref/path'})
                    .then((res) => {
                        assert.notCalled(utils.copyImg);
                        assert.deepEqual(res, {
                            imagePath: '/ref/path',
                            updated: false
                        });
                    });
            });
        });

        it('should update a reference image if images are different', () => {
            Image.compare.resolves(false);
            temp.path.withArgs({suffix: '.png'}).returns('/temp/path');

            return exec_({referencePath: '/ref/path'})
                .then((res) => {
                    assert.calledOnceWith(utils.copyImg, '/temp/path', '/ref/path');
                    assert.deepEqual(res, {
                        imagePath: '/ref/path',
                        updated: true
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

            const capture = _.set({}, 'image.save', Image.prototype.save);

            return exec_({referencePath: '/ref/path'}, capture)
                .then((res) => {
                    assert.calledOnceWith(utils.saveRef, '/ref/path', capture);
                    assert.deepEqual(res, {
                        imagePath: '/ref/path',
                        updated: true
                    });
                });
        });

        it('should not update a reference image if images are the same', () => {
            return exec_({referencePath: '/ref/path'})
                .then((res) => {
                    assert.notCalled(utils.copyImg);
                    assert.deepEqual(res, {
                        imagePath: '/ref/path',
                        updated: false
                    });
                });
        });

        it('should update a reference image if images are different', () => {
            Image.compare.resolves(false);
            temp.path.withArgs({suffix: '.png'}).returns('/temp/path');

            return exec_({referencePath: '/ref/path'})
                .then((res) => {
                    assert.calledOnceWith(utils.copyImg, '/temp/path', '/ref/path');
                    assert.deepEqual(res, {
                        imagePath: '/ref/path',
                        updated: true
                    });
                });
        });
    });
});
