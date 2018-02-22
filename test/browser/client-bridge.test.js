'use strict';

const {clientBridge: {ClientBridge}} = require('gemini-core');
const eachSupportedBrowser = require('./util').eachSupportedBrowser;

const TEST_SCRIPT = 'window.__gemini = {}; window.__gemini.add2 = function(x) { return x + 2; }';

describe('ClientBridge', () => {
    eachSupportedBrowser(() => {
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
