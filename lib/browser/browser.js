'use strict';

var wd = require('wd'),
    _ = require('lodash'),
    Camera = require('./camera');

module.exports = class Browser {
    constructor(config) {
        this.config = config;
        this.id = config.id;
        this._wd = wd.promiseRemote(config.gridUrl);
        this._camera = new Camera(this._wd, config.screenshotMode);

        this.sessionId = null;
        this._calibration = null;
    }

    captureViewportImage(page) {
        return this._camera.captureViewportImage(page);
    }

    serialize() {
        const props = ['id', 'gridUrl', 'httpTimeout', 'screenshotMode', 'compositeImage'];

        return {
            config: _.pick(this.config, props),
            sessionId: this.sessionId,
            calibration: this._calibration
        };
    }

    scrollBy(x, y) {
        return this._camera.scroll(x, y);
    }

    _setCalibration(calibration) {
        this._calibration = calibration;
        this._camera.calibrate(calibration);
    }

    _setHttpTimeout() {
        return this._configureHttp(this.config.httpTimeout);
    }

    _setSessionRequestTimeout() {
        const sessionRequestTimeout = _.isNull(this.config.sessionRequestTimeout)
            ? this.config.httpTimeout
            : this.config.sessionRequestTimeout;

        return this._configureHttp(sessionRequestTimeout);
    }

    _configureHttp(timeout) {
        return this._wd.configureHttp({retries: 'never', timeout});
    }
};
