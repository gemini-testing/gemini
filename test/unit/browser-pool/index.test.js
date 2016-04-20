'use strict';
var LimitedPool = require('../../../lib/browser-pool/limited-pool'),
    PerBrowserLimitedPool = require('../../../lib/browser-pool/per-browser-limited-pool'),
    pool = require('../../../lib/browser-pool');

describe('browser-pool', function() {
    function mkConfig(opts) {
        return {
            system: opts || {},
            forBrowser: sinon.stub().returns({id: 'id'}),
            getBrowserIds: sinon.stub().returns(['id'])
        };
    }

    it('should create pool according perBrowserLimit by default', function() {
        var browserPool = pool.create(mkConfig());

        assert.instanceOf(browserPool, PerBrowserLimitedPool);
    });

    it('should create pool according parallelLimit if that option exist', function() {
        var browserPool = pool.create(mkConfig({
                parallelLimit: 10
            }));

        assert.instanceOf(browserPool, LimitedPool);
    });

    it('should ignore parallelLimit if it value is Infinity', function() {
        var browserPool = pool.create(mkConfig({
                parallelLimit: Infinity
            }));

        assert.instanceOf(browserPool, PerBrowserLimitedPool);
    });
});
