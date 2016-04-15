'use strict';

var browserFabric = require('../../../lib/browser'),
    NewBrowser = require('../../../lib/browser/new-browser'),
    ExistingBrowser = require('../../../lib/browser/existing-browser');

describe('browser', () => {
    describe('create', () => {
        it('should create NewBrowser instance', function() {
            var browser = browserFabric.create({});

            assert.instanceOf(browser, NewBrowser);
        });
    });

    describe('fromObject', () => {
        it('should return promise with ExistingBrowser instance', function() {
            var serializedBrowser = {
                    config: {}
                };

            return browserFabric.fromObject(serializedBrowser)
                .then(browser => {
                    assert.instanceOf(browser, ExistingBrowser);
                });
        });
    });
});
