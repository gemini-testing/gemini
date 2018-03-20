'use strict';

const Skip = require('./index');
const _ = require('lodash');

module.exports = class OnlyBuilder extends Skip {
    static create(suite) {
        return new OnlyBuilder(suite);
    }

    constructor(suite) {
        super(suite);
    }

    in(...browsers) {
        return this._process(browsers);
    }

    notIn(...browsers) {
        return this._process(browsers, {negate: true});
    }

    _process(browsers, opts = {negate: false}) {
        browsers = normalizeArgs(browsers);
        this._validateArgs(browsers);

        this._suite.browsers = this._suite.browsers.filter(this._shouldSkip(browsers, opts));
        return this;
    }

    buildAPI(context) {
        const only = {
            in: (...browsers) => {
                this.in(...browsers);
                return context;
            },
            notIn: (...browsers) => {
                this.notIn(...browsers);
                return context;
            }
        };
        const browsers = (...browsers) => {
            this.in(...browsers);
            return context;
        };

        return {only, browsers};
    }
};

function normalizeArgs(browsers) {
    if (browsers.length === 0) {
        return;
    }
    if (browsers.length === 1 && _.isArray(browsers[0])) {
        return browsers[0];
    }
    return browsers;
}
