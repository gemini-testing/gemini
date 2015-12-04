'use strict';

var fs = require('fs'),
    path = require('path'),
    temp = require('temp'),
    Image = require('../../lib/image');

function imagePath(name) {
    return path.join(__dirname, 'data', 'image', name);
}

function withTempFile(func) {
    var filePath = temp.path({suffix: '.png'});
    return func(filePath).fin(function() {
        try {
            fs.unlinkSync(filePath);
        } catch (e) {
        }
    });
}

function assertSameImages(refName, filePath) {
    return assert.eventually.isTrue(Image.compare(
        imagePath(refName),
        filePath
    ), 'expected image to be equal to ' + refName);
}

describe('image', function() {
    describe('compare', function() {
        it('should resolve to `true` for equal images', function() {
            return assert.eventually.isTrue(Image.compare(
                imagePath('image1.png'),
                imagePath('image2.png')
            ));
        });

        it('should resolve to `false` for non-equal images', function() {
            return assert.eventually.isFalse(Image.compare(
                imagePath('image1.png'),
                imagePath('image3.png')
            ));
        });

        it('should resolve to `true` for non-equal images if tolerance is high enough', function() {
            return assert.eventually.isTrue(Image.compare(
                imagePath('image1.png'),
                imagePath('image3.png'),
                {tolerance: 50}
            ));
        });

        it('should resolve to `true` for images with unnoticable difference', function() {
            return assert.eventually.isTrue(Image.compare(
                imagePath('image1.png'),
                imagePath('image4.png')
            ));
        });

        it('should resolve to `false` for images with unnoticable difference if strictComparison=true', function() {
            return assert.eventually.isFalse(Image.compare(
                imagePath('image1.png'),
                imagePath('image4.png'),
                {strictComparison: true}
            ));
        });
    });

    describe('buildDiff', function() {
        it('should build diff image', function() {
            return withTempFile(function(fileName) {
                var opts = {
                    reference: imagePath('image1.png'),
                    current: imagePath('image3.png'),
                    diff: fileName,
                    diffColor: '#f0001c'
                };
                return Image.buildDiff(opts)
                    .then(function() {
                        return assertSameImages('image_diff.png', fileName);
                    });
            });
        });

        it('should allow to change diff color', function() {
            return withTempFile(function(fileName) {
                var opts = {
                    reference: imagePath('image1.png'),
                    current: imagePath('image3.png'),
                    diff: fileName,
                    diffColor: '#0000ff'
                };
                return Image.buildDiff(opts)
                    .then(function() {
                        return assertSameImages('image_diff_blue.png', fileName);
                    });
            });
        });
    });

    describe('instance', function() {
        beforeEach(function() {
            var imageBuf = fs.readFileSync(imagePath('image1.png'));
            this.image = new Image(imageBuf);
        });

        it('should return correct size', function() {
            var size = this.image.getSize();
            assert.equal(size.width, 20);
            assert.equal(size.height, 20);
        });

        it('should save the image', function() {
            var _this = this;
            return withTempFile(function(filePath) {
                return _this.image.save(filePath)
                    .then(function() {
                        return assertSameImages('image1.png', filePath);
                    });
            });
        });

        it('should crop image', function() {
            var _this = this;
            return withTempFile(function(filePath) {
                return _this.image.crop({top: 1, left:1, width: 18, height: 18})
                    .then(function(image) {
                        return image.save(filePath);
                    })
                    .then(function() {
                        return assertSameImages('image1_cropped.png', filePath);
                    });
            });
        });

        it('should clear a region of an image', function() {
            var _this = this;
            return withTempFile(function(filePath) {
                _this.image.clear({top: 2, left: 4, width: 8, height: 6});
                return _this.image.save(filePath)
                    .then(function() {
                        return assertSameImages('image1_cleared.png', filePath);
                    });
            });
        });

        describe('getRGBA', function() {
            it('should return proper color values', function() {
                assert.deepEqual(this.image.getRGBA(0, 0), {r: 9, g: 9, b: 9, a: 255});
            });
        });
    });
});
