'use strict';

const _ = require('lodash');

const Image = require('../../../../lib/image');
const IdentityTransformer = require('../../../../lib/capture-session/transformer/identity-transformer');
const MoveTransformer = require('../../../../lib/capture-session/transformer/move-transformer');
const ScaleTransformer = require('../../../../lib/capture-session/transformer/scale-transformer');
const Transformer = require('../../../../lib/capture-session/transformer');

describe('Transformer', () => {
    const sandbox = sinon.sandbox.create();

    let transformer;
    let imageSize;

    beforeEach(() => {
        imageSize = {width: 10, height: 10};
        sandbox.stub(Image.prototype);
        Image.prototype.getSize.returns(imageSize);
    });

    afterEach(() => sandbox.restore());

    function createTransform_(dimensions) {
        return transformer.create(new Image(), dimensions);
    }

    describe('usePixelRatio disabled', () => {
        describe('screenshotMode is "auto"', () => {
            beforeEach(() => {
                transformer = new Transformer({
                    usePixelRatio: false,
                    config: {
                        screenshotMode: 'auto'
                    }
                });
            });

            describe('should not modify image', () => {
                it('if captured image size is bigger then document size', () => {
                    assert.instanceOf(createTransform_({
                        documentWidth: imageSize.width - 1,
                        documentHeight: imageSize.height - 1
                    }), IdentityTransformer);
                });

                it('if captured image width is bigger then document width and heights are same', () => {
                    assert.instanceOf(createTransform_({
                        documentWidth: imageSize.width - 1,
                        documentHeight: imageSize.height
                    }), IdentityTransformer);
                });

                it('if captured image height is bigger then document height and widths are same', () => {
                    assert.instanceOf(createTransform_({
                        documentWidth: imageSize.width,
                        documentHeight: imageSize.height - 1
                    }), IdentityTransformer);
                });

                it('if captured image size and document size are same', () => {
                    assert.instanceOf(createTransform_({
                        documentWidth: imageSize.width,
                        documentHeight: imageSize.height
                    }), IdentityTransformer);
                });
            });

            describe('should move image to offset params', () => {
                it('if captured image width is smaller then document width', () => {
                    assert.instanceOf(createTransform_({
                        documentWidth: imageSize.width + 1,
                        documentHeight: imageSize.height - 1
                    }), MoveTransformer);
                });

                it('if captured image height is smaller then document height', () => {
                    assert.instanceOf(createTransform_({
                        documentWidth: imageSize.width - 1,
                        documentHeight: imageSize.height + 1
                    }), MoveTransformer);
                });

                it('if captured image size is smaller then document size', () => {
                    assert.instanceOf(createTransform_({
                        documentWidth: imageSize.width + 1,
                        documentHeight: imageSize.height + 1
                    }), MoveTransformer);
                });
            });
        });

        it('should always use source image if "screenshotMode" is "fullpage"', () => {
            transformer = new Transformer({
                usePixelRatio: false,
                config: {
                    screenshotMode: 'fullpage'
                }
            });

            assert.instanceOf(createTransform_({
                documentWidth: imageSize.width + 999,
                documentHeight: imageSize.height + 999
            }), IdentityTransformer);
        });

        it('should always move image to offset params if "screenshotMode" is "viewport"', () => {
            transformer = new Transformer({
                usePixelRatio: false,
                config: {
                    screenshotMode: 'viewport'
                }
            });

            assert.instanceOf(createTransform_({
                documentWidth: 1,
                documentHeight: 1
            }), MoveTransformer);
        });
    });

    describe('usePixelRatio enabled', () => {
        function createPageDisposition_(dimensions) {
            dimensions = dimensions || {};
            return _.extend({
                documentWidth: 6,
                documentHeight: 6,
                pixelRatio: 2,
                viewportOffset: {
                    left: 1,
                    top: 2
                }
            }, dimensions);
        }

        beforeEach(() => {
            sandbox.stub(IdentityTransformer, 'create').named('identityCreate');
            sandbox.stub(MoveTransformer, 'create').named('moveCreate');
            sandbox.stub(ScaleTransformer, 'create').named('scaleCreate');

            transformer = new Transformer({
                usePixelRatio: true,
                config: {
                    screenshotMode: 'auto'
                }
            });
        });

        it('should not modify image if captured size is larger then document size', () => {
            createTransform_(createPageDisposition_({
                documentWidth: imageSize.width / 2 - 1,
                documentHeight: imageSize.height / 2 - 1
            }));

            assert.callOrder(
                IdentityTransformer.create,
                ScaleTransformer.create
            );
        });

        it('should scale moved image if captured size is smaller then document size', () => {
            createTransform_(createPageDisposition_({
                documentWidth: imageSize.width / 2 + 1,
                documentHeight: imageSize.height / 2 + 1
            }));

            assert.callOrder(
                IdentityTransformer.create,
                MoveTransformer.create,
                ScaleTransformer.create
            );
        });

        it('should always use scaled source image if "screenshotMode" is "fullpage"', () => {
            transformer = new Transformer({
                usePixelRatio: true,
                config: {
                    screenshotMode: 'fullpage'
                }
            });

            createTransform_(createPageDisposition_({
                documentWidth: imageSize.width + 999,
                documentHeight: imageSize.height + 999
            }));

            assert.callOrder(
                IdentityTransformer.create,
                ScaleTransformer.create
            );
        });

        it('should always use scaled moved image if "screenshotMode" is "viewport"', () => {
            transformer = new Transformer({
                usePixelRatio: true,
                config: {
                    screenshotMode: 'viewport'
                }
            });

            createTransform_(createPageDisposition_({
                documentWidth: 1,
                documentHeight: 1
            }));

            assert.callOrder(
                IdentityTransformer.create,
                MoveTransformer.create,
                ScaleTransformer.create
            );
        });

        it('should not scale image if "pixelRatio" value is 1', () => {
            createTransform_(createPageDisposition_({
                documentWidth: imageSize.width - 1,
                documentHeight: imageSize.height - 1,
                pixelRatio: 1
            }));

            assert.called(IdentityTransformer.create);
            assert.notCalled(ScaleTransformer.create);
        });

        it('should not scale moved image if "pixelRatio" value is 1', () => {
            createTransform_(createPageDisposition_({
                documentWidth: imageSize.width + 1,
                documentHeight: imageSize.height + 1,
                pixelRatio: 1
            }));

            assert.called(IdentityTransformer.create);
            assert.called(MoveTransformer.create);
            assert.notCalled(ScaleTransformer.create);
        });
    });
});
