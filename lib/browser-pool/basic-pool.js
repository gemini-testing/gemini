'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Browser = require('../browser');
const CancelledError = require('../errors/cancelled-error');
const Pool = require('./pool');

module.exports = class BasicPool extends Pool {
    /**
     * @constructor
     * @extends Pool
     * @param {Config} config
     * @param {Calibrator} calibrator
     */
    constructor(config, calibrator) {
        super();

        this._config = config;
        this._calibrator = calibrator;

        this._activeSessions = {};
    }

    getBrowser(id) {
        const browser = Browser.create(this._config.forBrowser(id));

        return browser.launch(this._calibrator)
            .then(() => {
                if (this._cancelled) {
                    return Promise.reject(new CancelledError());
                }

                this._activeSessions[browser.sessionId] = browser;
            })
            .then(() => browser.reset())
            .thenReturn(browser)
            .catch((e) => this.freeBrowser(browser).then(() => Promise.reject(e)));
    }

    freeBrowser(browser) {
        delete this._activeSessions[browser.sessionId];
        return browser.quit();
    }

    cancel() {
        this._cancelled = true;

        _.forEach(this._activeSessions, (browser) => browser.quit());

        this._activeSessions = {};
    }
};
