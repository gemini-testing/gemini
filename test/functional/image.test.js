'use strict';

const fs = require('fs');
const Image = require('../../lib/image');
const util = require('./util');

describe('image', () => {
    let image;

    beforeEach(() => {
        const imageBuf = fs.readFileSync(util.imagePath('image1.png'));
        image = new Image(imageBuf);
    });

    it('should return correct size', () => {
        assert.deepEqual(
            image.getSize(),
            {width: 20, height: 20}
        );
    });

    it('should save the image', () => {
        return util.withTempFile((filePath) => {
            return image.save(filePath)
                .then(() => util.assertSameImages('image1.png', filePath));
        });
    });

    it('should crop image', () => {
        return util.withTempFile((filePath) => {
            return image.crop({top: 1, left: 1, width: 18, height: 18})
                .then((image) => image.save(filePath))
                .then(() => util.assertSameImages('image1_cropped.png', filePath));
        });
    });

    it('should crop image according to scale factor', () => {
        return util.withTempFile((filePath) => {
            const cropArea = {top: 5, left: 5, width: 90, height: 90};
            const scaleOpts = {scaleFactor: 0.2};
            return image.crop(cropArea, scaleOpts)
                .then((image) => image.save(filePath))
                .then(() => util.assertSameImages('image1_cropped.png', filePath));
        });
    });

    it('should clear a region of an image', () => {
        return util.withTempFile((filePath) => {
            image.clear({top: 2, left: 4, width: 8, height: 6});
            return image.save(filePath)
                .then(() => util.assertSameImages('image1_cleared.png', filePath));
        });
    });

    it('should clear a region of an image according to scale factor', () => {
        const clearArea = {top: 5, left: 10, width: 20, height: 15};
        const scaleOpts = {scaleFactor: 0.4};
        return util.withTempFile((filePath) => {
            image.clear(clearArea, scaleOpts);
            return image.save(filePath)
                .then(() => util.assertSameImages('image1_cleared.png', filePath));
        });
    });

    describe('getRGBA', () => {
        it('should return proper color values', () => {
            assert.deepEqual(image.getRGBA(0, 0), {r: 9, g: 9, b: 9, a: 255});
        });
    });

    describe('compare', () => {
        it('should resolve to `true` for equal images', () => {
            return assert.eventually.isTrue(Image.compare(
                util.imagePath('image1.png'),
                util.imagePath('image2.png')
            ));
        });

        it('should resolve to `false` for non-equal images', () => {
            return assert.eventually.isFalse(Image.compare(
                util.imagePath('image1.png'),
                util.imagePath('image3.png')
            ));
        });

        it('should resolve to `true` for non-equal images if tolerance is high enough', () => {
            return assert.eventually.isTrue(Image.compare(
                util.imagePath('image1.png'),
                util.imagePath('image3.png'),
                {tolerance: 50}
            ));
        });

        it('should resolve to `true` for images with unnoticable difference', () => {
            return assert.eventually.isTrue(Image.compare(
                util.imagePath('image1.png'),
                util.imagePath('image4.png')
            ));
        });
    });

    describe('buildDiff', () => {
        it('should build diff image', () => {
            return util.withTempFile((fileName) => {
                var opts = {
                    reference: util.imagePath('image1.png'),
                    current: util.imagePath('image3.png'),
                    diff: fileName,
                    diffColor: '#f0001c'
                };
                return Image.buildDiff(opts)
                    .then(() => util.assertSameImages('image_diff.png', fileName));
            });
        });

        it('should allow to change diff color', () => {
            return util.withTempFile((fileName) => {
                var opts = {
                    reference: util.imagePath('image1.png'),
                    current: util.imagePath('image3.png'),
                    diff: fileName,
                    diffColor: '#0000ff'
                };
                return Image.buildDiff(opts)
                    .then(() => util.assertSameImages('image_diff_blue.png', fileName));
            });
        });
    });
});
