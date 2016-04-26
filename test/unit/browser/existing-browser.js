'use strict';

const ExistingBrowser = require('../../../lib/browser/existing-browser');

describe('browser/existing-browser', () => {
    it('should use pixel ratio if it set in calibration', () => {
        const calibration = {usePixelRatio: true};
        const browser = new ExistingBrowser('sessionId', {some: 'config'}, calibration);

        assert.equal(browser.usePixelRatio, true);
    });
});
