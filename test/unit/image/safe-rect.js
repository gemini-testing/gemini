'use strict';

const SafeRect = require('lib/image/safe-rect');

describe('SafeRect', () => {
    describe('left', () => {
        it('should return rectangle left coordinate if it is a positive number', () => {
            const safeRect = SafeRect.create({left: 1});

            assert.equal(safeRect.left, 1);
        });

        it('should handle cases when rectangle left coordinate is a negative number', () => {
            const safeRect = SafeRect.create({left: -1});

            assert.equal(safeRect.left, 0);
        });

        it('should handle cases when rectangle left coordinate is 0', () => {
            const safeRect = SafeRect.create({left: 0});

            assert.equal(safeRect.left, 0);
        });
    });

    describe('top', () => {
        it('should return rectangle top coordinate if it is a positive number', () => {
            const safeRect = SafeRect.create({top: 1});

            assert.equal(safeRect.top, 1);
        });

        it('should handle cases when rectangle top coordinate is a negative number', () => {
            const safeRect = SafeRect.create({top: -1});

            assert.equal(safeRect.top, 0);
        });

        it('should handle cases when rectangle top coordinate is 0', () => {
            const safeRect = SafeRect.create({top: 0});

            assert.equal(safeRect.top, 0);
        });
    });

    describe('width', () => {
        it('should return rectangle width when its position is not out of the bounds of image width', () => {
            const safeRect = SafeRect.create({left: 1, width: 2}, {width: 4});

            assert.equal(safeRect.width, 2);
        });

        it('should return rectangle width when its position is at the bounds of image width', () => {
            const safeRect = SafeRect.create({left: 1, width: 3}, {width: 4});

            assert.equal(safeRect.width, 3);
        });

        it('should handle cases when rectangle position is out of the bounds of image width', () => {
            const safeRect = SafeRect.create({left: 1, width: 5}, {width: 4});

            assert.equal(safeRect.width, 4 - 1);
        });

        it('should handle cases when rectangle left coordinate is a negative number', () => {
            const safeRect = SafeRect.create({left: -1, width: 5}, {width: 4});

            assert.equal(safeRect.width, 4);
        });
    });

    describe('height', () => {
        it('should return rectangle height when its position is not out of the bounds of image height', () => {
            const safeRect = SafeRect.create({top: 1, height: 2}, {height: 4});

            assert.equal(safeRect.height, 2);
        });

        it('should return rectangle height when its position is at the bounds of image height', () => {
            const safeRect = SafeRect.create({top: 1, height: 3}, {height: 4});

            assert.equal(safeRect.height, 3);
        });

        it('should handle cases when rectangle position is out of the bounds of image height', () => {
            const safeRect = SafeRect.create({top: 1, height: 5}, {height: 4});

            assert.equal(safeRect.height, 4 - 1);
        });

        it('should handle cases when rectangle top coordinate is a negative number', () => {
            const safeRect = SafeRect.create({top: -1, height: 5}, {height: 4});

            assert.equal(safeRect.height, 4);
        });
    });
});
