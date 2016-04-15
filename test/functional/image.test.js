'use strict';

var fs = require('fs'),
    Image = require('../../lib/image'),
    util = require('./util');

describe('image', function() {
    beforeEach(function() {
        var imageBuf = fs.readFileSync(util.imagePath('image1.png'));
        this.image = new Image(imageBuf);
    });

    it('should return correct size', function() {
        assert.deepEqual(
            this.image.getSize(),
            {width: 20, height: 20}
        );
    });

    it('should save the image', function() {
        var _this = this;
        return util.withTempFile(function(filePath) {
            return _this.image.save(filePath)
                .then(function() {
                    return util.assertSameImages('image1.png', filePath);
                });
        });
    });

    it('should crop image', function() {
        var _this = this;
        return util.withTempFile(function(filePath) {
            return _this.image.crop({top: 1, left: 1, width: 18, height: 18})
                .then(function(image) {
                    return image.save(filePath);
                })
                .then(function() {
                    return util.assertSameImages('image1_cropped.png', filePath);
                });
        });
    });

    it('should clear a region of an image', function() {
        var _this = this;
        return util.withTempFile(function(filePath) {
            _this.image.clear({top: 2, left: 4, width: 8, height: 6});
            return _this.image.save(filePath)
                .then(function() {
                    return util.assertSameImages('image1_cleared.png', filePath);
                });
        });
    });

    describe('getRGBA', function() {
        it('should return proper color values', function() {
            assert.deepEqual(this.image.getRGBA(0, 0), {r: 9, g: 9, b: 9, a: 255});
        });
    });

    describe('compare', function() {
        it('should resolve to `true` for equal images', function() {
            return assert.eventually.isTrue(Image.compare(
                util.imagePath('image1.png'),
                util.imagePath('image2.png')
            ));
        });

        it('should resolve to `false` for non-equal images', function() {
            return assert.eventually.isFalse(Image.compare(
                util.imagePath('image1.png'),
                util.imagePath('image3.png')
            ));
        });

        it('should resolve to `true` for non-equal images if tolerance is high enough', function() {
            return assert.eventually.isTrue(Image.compare(
                util.imagePath('image1.png'),
                util.imagePath('image3.png'),
                {tolerance: 50}
            ));
        });

        it('should resolve to `true` for images with unnoticable difference', function() {
            return assert.eventually.isTrue(Image.compare(
                util.imagePath('image1.png'),
                util.imagePath('image4.png')
            ));
        });
    });

    describe('buildDiff', function() {
        it('should build diff image', function() {
            return util.withTempFile(function(fileName) {
                var opts = {
                    reference: util.imagePath('image1.png'),
                    current: util.imagePath('image3.png'),
                    diff: fileName,
                    diffColor: '#f0001c'
                };
                return Image.buildDiff(opts)
                    .then(function() {
                        return util.assertSameImages('image_diff.png', fileName);
                    });
            });
        });

        it('should allow to change diff color', function() {
            return util.withTempFile(function(fileName) {
                var opts = {
                    reference: util.imagePath('image1.png'),
                    current: util.imagePath('image3.png'),
                    diff: fileName,
                    diffColor: '#0000ff'
                };
                return Image.buildDiff(opts)
                    .then(function() {
                        return util.assertSameImages('image_diff_blue.png', fileName);
                    });
            });
        });
    });
});
