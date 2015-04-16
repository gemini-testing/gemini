'use strict';
var assert = require('chai').assert,
    Stats = require('../lib/stats');

describe('stats', function() {
    beforeEach(function() {
        this.stats = new Stats();
    });

    it('should allow to add new key', function() {
        this.stats.add('counter');
        assert.equal(this.stats.data.counter, 1);
    });

    it('should increment existing keys', function() {
        this.stats.add('counter');
        this.stats.add('counter');
        assert.equal(this.stats.data.counter, 2);
    });
});
