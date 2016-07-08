'use strict';

var ClientBridge = require('lib/browser/client-bridge'),
    eachSupportedBrowser = require('./util').eachSupportedBrowser,

    TEST_SCRIPT = 'window.__gemini = {}; window.__gemini.add2 = function(x) { return x + 2; }';

describe('ClientBridge', function() {
    eachSupportedBrowser(function() {
        beforeEach(function() {
            this.bridge = new ClientBridge(this.browser, TEST_SCRIPT);
            return this.browser.initSession();
        });

        afterEach(function() {
            return this.browser.quit();
        });

        it('should succesfully perform client method call', function() {
            return assert.becomes(this.bridge.call('add2', [1]), 3);
        });
    });
});
