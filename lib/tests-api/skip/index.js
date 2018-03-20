'use strict';

const _ = require('lodash');

module.exports = class Skip {
    constructor(suite) {
        this._suite = suite;
    }

    _validateArgs(browsers) {
        if (!this._isArrayOfStringsAndRegExps(browsers)) {
            throw new TypeError('Browsers must be an array with strings and RegExp objects');
        }
    }

    _shouldSkip(browsers, {negate} = {}) {
        const fn = negate ? _.every : _.some;
        return (browserId) => fn(this._mkBrowsersMatcher(browsers, {negate}), (matcher) => matcher(browserId));
    }

    _mkBrowsersMatcher(browsers, {negate}) {
        const mkMatcher = (browser) => _.isRegExp(browser) ? browser.test.bind(browser) : _.isEqual.bind(null, browser);

        return browsers.map((browser) => negate ? _.negate(mkMatcher(browser)) : mkMatcher(browser));
    }

    _isArrayOfStringsAndRegExps(arr) {
        return _.isArray(arr) && _.every(arr, (item) => _.isString(item) || _.isRegExp(item));
    }

    in() {
        return new Error('Not implemented');
    }

    notIn() {
        return new Error('Not implemented');
    }

    buildAPI() {
        return new Error('Not implemented');
    }
};
