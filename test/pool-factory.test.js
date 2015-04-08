'use strict';
var browserPool = require('../lib/browser-pool'),
    assert = require('chai').assert,
    Pool = require('../lib/browser-pool/pool'),
    LimitedPool = require('../lib/browser-pool/limited-pool'),
    CachingPool = require('../lib/browser-pool/caching-pool');

describe('pool factory', function() {
    describe('without parallelLimit', function() {
        it('should create unlimited pool', function() {
            assert.instanceOf(
                browserPool.create({sessionMode: 'perSuite'}),
                Pool
            );
        });
    });

    describe('with parallelLimit', function() {
        it('should create limited pool', function() {
            var pool = browserPool.create({sessionMode: 'perSuite', parallelLimit: 1});
            assert.instanceOf(pool, LimitedPool);
            assert.instanceOf(pool.underlyingPool, Pool);
        });
    });

    describe('with perBrowser session mode', function() {
        it('should create unlimited pool wrapped in caching pool', function() {
            var pool = browserPool.create({sessionMode: 'perBrowser'});
            assert.instanceOf(pool, CachingPool);
            assert.instanceOf(pool.underlyingPool, Pool);
        });
    });

    describe('with perBrowser mode and parallelLimit', function() {
        it('should create limited pool wrapped in caching pool', function() {
            var pool = browserPool.create({sessionMode: 'perBrowser', parallelLimit: 1});
            assert.instanceOf(pool, CachingPool);
            assert.instanceOf(pool.underlyingPool, LimitedPool);
        });
    });
});
