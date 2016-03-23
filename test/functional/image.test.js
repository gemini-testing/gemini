'use strict';

var fs = require('fs'),
    Image = require('../../src/image'),
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
});
