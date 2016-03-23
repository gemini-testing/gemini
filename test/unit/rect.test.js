'use strict';

var Rect = require('../../src/browser/client-scripts/rect').Rect;

describe('Rect', function() {
    describe('constructor', function() {
        it('should create instance using width/height properties', function() {
            assert.doesNotThrow(function() {
                return new Rect({
                    top: 10,
                    left: 20,
                    width: 100,
                    height: 100
                });
            });
        });

        it('should create instance using bottom/right properties', function() {
            assert.doesNotThrow(function() {
                return new Rect({
                    top: 10,
                    left: 20,
                    bottom: 100,
                    right: 100
                });
            });
        });

        it('should fail when there are no bottom/right or width/height properties', function() {
            assert.throws(function() {
                return new Rect({top: 10, left: 20});
            });
        });
    });

    describe('rectInside', function() {
        var rect = new Rect({
            top: 10,
            left: 20,
            width: 100,
            height: 100
        });

        it('should return true when rect is inside', function() {
            assert.isTrue(rect.rectInside(
                new Rect({
                    top: rect.top + 10,
                    left: rect.left + 10,
                    width: rect.width - 50,
                    height: rect.height - 50
                })
            ));
        });

        it('should return false when rect is not inside', function() {
            assert.isFalse(rect.rectInside(
                new Rect({
                    top: rect.top - 5,
                    left: rect.left - 5,
                    width: rect.width,
                    height: rect.width
                })
            ));
        });
    });
});
