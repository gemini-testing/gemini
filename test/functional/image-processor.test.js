'use strict';

var EventEmitter = require('events').EventEmitter,
    util = require('./util'),
    ImageProcessor = require('../../lib/image-processor'),
    RunnerEvents = require('../../lib/constants/runner-events');

describe('image', function() {
    var emitter = new EventEmitter(),
        imageProcessor = new ImageProcessor(emitter);

    after(function() {
        emitter.emit(RunnerEvents.END);
    });

    describe('compare', function() {
        it('should resolve to `true` for equal images', function() {
            return assert.eventually.isTrue(imageProcessor.compare(
                util.imagePath('image1.png'),
                util.imagePath('image2.png')
            ));
        });

        it('should resolve to `false` for non-equal images', function() {
            return assert.eventually.isFalse(imageProcessor.compare(
                util.imagePath('image1.png'),
                util.imagePath('image3.png')
            ));
        });

        it('should resolve to `true` for non-equal images if tolerance is high enough', function() {
            return assert.eventually.isTrue(imageProcessor.compare(
                util.imagePath('image1.png'),
                util.imagePath('image3.png'),
                {tolerance: 50}
            ));
        });

        it('should resolve to `true` for images with unnoticable difference', function() {
            return assert.eventually.isTrue(imageProcessor.compare(
                util.imagePath('image1.png'),
                util.imagePath('image4.png')
            ));
        });

        it('should resolve to `false` for images with unnoticable difference if strictComparison=true', function() {
            return assert.eventually.isFalse(imageProcessor.compare(
                util.imagePath('image1.png'),
                util.imagePath('image4.png'),
                {strictComparison: true}
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
                return imageProcessor.buildDiff(opts)
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
                return imageProcessor.buildDiff(opts)
                    .then(function() {
                        return util.assertSameImages('image_diff_blue.png', fileName);
                    });
            });
        });
    });
});
