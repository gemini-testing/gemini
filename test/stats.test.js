'use strict';
var Stats = require('../lib/stats');

describe('stats', function() {
    beforeEach(function() {
        this.stats = new Stats();
    });

    it('should allow to add new key', function() {
        this.stats.add('counter');
        this.stats.data.counter.must.be(1);
    });

    it('should increment existing keys', function() {
        this.stats.add('counter');
        this.stats.add('counter');
        this.stats.data.counter.must.be(2);
    });
});
