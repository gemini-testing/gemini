'use strict';
var Rect = require('../lib/geometery/rect');

describe('rect', function() {
    var rect;

    beforeEach(function() {
        rect = new Rect(10, 20, 30, 40);
    });

    it('should have correct x', function() {
        rect.x.must.equal(10);
    });

    it('should have correct y', function() {
        rect.y.must.equal(20);
    });

    it('should report correct width', function() {
        rect.width.must.equal(30);
    });

    it('should report correct height', function() {
        rect.height.must.equal(40);
    });

    it('should report correct right', function() {
        rect.right.must.equal(40);
    });

    it('should report correct bottom', function() {
        rect.bottom.must.equal(60);
    });

    describe('#merge', function() {
        it('should pick smaller x', function() {
            rect.merge(new Rect(1, 0, 0, 0)).x.must.equal(1);
        });

        it('should not pick larger x', function() {
            rect.merge(new Rect(11, 0, 0, 0)).x.must.equal(10);
        });

        it('should pick smaller y', function() {
            rect.merge(new Rect(0, 1, 0, 0)).y.must.equal(1);
        });

        it('should not pick larger y', function() {
            rect.merge(new Rect(0, 25, 0, 0)).y.must.equal(20);
        });

        it('should pick larger right', function() {
            rect.merge(new Rect(0, 0, 100, 40)).right.must.equal(100);
        });

        it('should not pick smaller right', function() {
            rect.merge(new Rect(15, 0, 10, 40)).right.must.equal(40);
        });

        it('should pick larger bottom', function() {
            rect.merge(new Rect(0, 10, 0, 55)).bottom.must.equal(65);
        });

        it('should not pick smaller bottom', function() {
            rect.merge(new Rect(0, 25, 0, 30)).bottom.must.equal(60);
        });
    });
});
