'use strict';
var assert = require('assert'),
    level = require('../lib/coverage-level');
describe('coverage level', function() {
    describe('merge', function() {
        it('NONE + NONE should equal NONE', function() {
            assert.equal(level.merge(level.NONE, level.NONE), level.NONE);
        });

        it('NONE + PARTIAL should equal PARTIAL', function() {
            assert.equal(level.merge(level.NONE, level.PARTIAL), level.PARTIAL);
        });

        it('PARTIAL + NONE should equal PARTIAL', function() {
            assert.equal(level.merge(level.PARTIAL, level.NONE), level.PARTIAL);
        });

        it('NONE + FULL should equal FULL', function() {
            assert.equal(level.merge(level.NONE, level.FULL), level.FULL);
        });

        it('FULL + NONE should equal FULL', function() {
            assert.equal(level.merge(level.FULL, level.NONE), level.FULL);
        });

        it('PARTIAL + FULL should equal FULL', function() {
            assert.equal(level.merge(level.PARTIAL, level.FULL), level.FULL);
        });

        it('FULL + PARTIAL should equal FULL', function() {
            assert.equal(level.merge(level.FULL, level.PARTIAL), level.FULL);
        });

        it('FULL + FULL should equal FULL', function() {
            assert.equal(level.merge(level.FULL, level.FULL), level.FULL);
        });
    });
});
