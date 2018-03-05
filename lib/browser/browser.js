'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const {browser: {Camera}} = require('gemini-core');
const wd = require('./wd-bluebird');

module.exports = class Browser {
    constructor(config) {
        this.config = config;
        this.id = config.id;
        this._wd = wd.promiseRemote(config.gridUrl);
        this._camera = Camera.create(config.screenshotMode, () => this._takeScreenshot());

        this.sessionId = null;
    }

    captureViewportImage(page) {
        return Promise.delay(this.config.screenshotDelay)
            .then(() => this._camera.captureViewportImage(page));
    }

    serialize() {
        const props = ['id', 'gridUrl', 'httpTimeout', 'screenshotMode', 'screenshotDelay', 'compositeImage'];

        return {
            config: _.pick(this.config, props),
            sessionId: this.sessionId,
            calibration: this._calibration
        };
    }

    scrollBy(x, y) {
        return this._wd.execute(`window.scrollBy(${x},${y})`);
    }

    toString() {
        return `${this.id}[${this.sessionId}]`;
    }

    _setCalibration(calibration) {
        this._calibration = calibration;
        this._camera.calibrate(calibration);
    }

    _setHttpTimeout() {
        return this._configureHttp(this.config.httpTimeout);
    }

    _configureHttp(timeout) {
        return this._wd.configureHttp({retries: 'never', timeout});
    }

    _takeScreenshot() {
        return this._tryScreenshotMethod('_takeScreenshotWithCurrentContext')
            .catch((originalError) => {
                return this._tryScreenshotMethod('_takeScreenshotWithNativeContext')
                    .catch(() => {
                        // if _takeScreenshotWithNativeContext fails too, the original error
                        // most likely was not related to the different Appium contexts and
                        // it is more useful to report it instead of second one
                        return Promise.reject(originalError);
                    });
            });
    }

    _tryScreenshotMethod(method) {
        return this[method]()
            .then((screenshot) => {
                this._takeScreenshot = this[method];
                return screenshot;
            });
    }

    _takeScreenshotWithCurrentContext() {
        return this._wd.takeScreenshot();
    }

    _takeScreenshotWithNativeContext() {
        return this._wd.currentContext()
            .then((oldContext) => {
                return this._wd.context('NATIVE_APP')
                    .then(() => this._takeScreenshotWithCurrentContext())
                    .finally(() =>this._wd.context(oldContext));
            });
    }
};
