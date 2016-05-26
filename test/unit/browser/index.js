'use strict';

const browserFabric = require('../../../lib/browser');
const NewBrowser = require('../../../lib/browser/new-browser');
const ExistingBrowser = require('../../../lib/browser/existing-browser');

describe('browser', () => {
    const createBrowser = () => browserFabric.create({});

    const getBrowserFromSerializedObject = () => browserFabric.fromObject({config: {}});

    describe('create', () => {
        it('should create NewBrowser instance', () => {
            assert.instanceOf(createBrowser(), NewBrowser);
        });
    });

    describe('fromObject', () => {
        it('should return promise with ExistingBrowser instance', () => {
            const browser = getBrowserFromSerializedObject();

            return assert.eventually.instanceOf(browser, ExistingBrowser);
        });
    });
});
