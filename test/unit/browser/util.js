'use strict';

const _ = require('lodash');
const {Image} = require('gemini-core');
const util = require('lib/browser/util');

describe('browser util.isFullPage', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    const isFullPage_ = (image, browserOpts, page) => {
        page = _.defaults(page || {}, {
            documentWidth: 100,
            documentHeight: 100,
            pixelRatio: 1
        });

        return util.isFullPage(image, page, browserOpts.screenshotMode);
    };

    const imageStub_ = (imageSize) => {
        const imageStub = sinon.createStubInstance(Image);
        imageStub.getSize.returns(imageSize);
        return imageStub;
    };

    it('should return true for "fullpage" screenshotMode', () => {
        const image = imageStub_({width: 100, height: 100});
        const result = isFullPage_(image, {screenshotMode: 'fullpage'});

        assert.isTrue(result);
    });

    it('should return false for "viewport" screenshotMode', () => {
        const image = imageStub_({width: 100, height: 100});
        const result = isFullPage_(image, {screenshotMode: 'viewport'});

        assert.isFalse(result);
    });

    describe('"auto" screenshotMode', () => {
        it('should return true if image size is bigger than document size', () => {
            const image = imageStub_({width: 100, height: 100});
            const result = isFullPage_(image, {screenshotMode: 'auto'}, {
                documentWidth: 99,
                documentHeight: 99
            });

            assert.isTrue(result);
        });

        it('should return true if image size and document size are the same', () => {
            const image = imageStub_({width: 100, height: 100});
            const result = isFullPage_(image, {screenshotMode: 'auto'}, {
                documentWidth: 100,
                documentHeight: 100
            });

            assert.isTrue(result);
        });

        it('should return false if image width is smaller than document width', () => {
            const image = imageStub_({width: 100, height: 100});
            const result = isFullPage_(image, {screenshotMode: 'auto'}, {
                documentWidth: 101,
                documentHeight: 100
            });

            assert.isFalse(result);
        });

        it('should return false if image height is smaller than document height', () => {
            const image = imageStub_({width: 100, height: 100});
            const result = isFullPage_(image, {screenshotMode: 'auto'}, {
                documentWidth: 100,
                documentHeight: 101
            });

            assert.isFalse(result);
        });

        it('should apply scale for document size if usePixelRatio was set', () => {
            const image = imageStub_({width: 100, height: 100});
            const result = isFullPage_(image, {screenshotMode: 'auto', usePixelRatio: true}, {
                documentWidth: 51,
                documentHeight: 51,
                pixelRatio: 2
            });

            assert.isFalse(result);
        });
    });
});
