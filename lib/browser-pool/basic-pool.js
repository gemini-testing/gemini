'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Browser = require('../browser');
const CancelledError = require('../errors/cancelled-error');
const Events = require('../constants/events');
const Pool = require('./pool');
const log = require('debug')('gemini:pool:basic');

module.exports = class BasicPool extends Pool {
    static create(config, calibrator, emitter) {
        return new BasicPool(config, calibrator, emitter);
    }

    /**
     * @constructor
     * @extends Pool
     * @param {Config} config
     * @param {Calibrator} calibrator
     */
    constructor(config, calibrator, emitter) {
        super();

        this._config = config;
        this._calibrator = calibrator;
        this._emitter = emitter;

        this._activeSessions = {};
    }

    getBrowser(id) {
        const browser = Browser.create(this._config.forBrowser(id));

        return browser.launch(this._calibrator)
            .then(() => {
                log(`browser ${id} started`);
                return this._emitter.emitAndWait(Events.START_BROWSER, browser);
            })
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
        log(`stop browser ${browser.id}`);

        return this._emitter.emitAndWait(Events.STOP_BROWSER, browser)
            .catch((err) => console.warn(err && err.stack || err))
            .then(() => browser.quit());
    }

    cancel() {
        this._cancelled = true;

        _.forEach(this._activeSessions, (browser) => browser.quit());

        this._activeSessions = {};
    }
};
