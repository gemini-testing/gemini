'use strict';

var wd = require('wd'),
    _ = require('lodash'),
    Camera = require('./camera');

module.exports = class Browser {
    constructor(config) {
        this.config = config;
        this.id = config.id;
        this._wd = wd.promiseRemote(config.gridUrl);
        this._camera = new Camera(this._wd);

        this.sessionId = null;
        this._calibration = null;
    }

    captureFullscreenImage() {
        return this._camera.captureFullscreenImage();
    }

    serialize() {
        return {
            config: _.pick(this.config, ['id', 'gridUrl', 'httpTimeout']),
            sessionId: this.sessionId,
            calibration: this._calibration
        };
    }

    scroll(x, y) {
        return this._camera.scroll(x, y);
    }

    _setCalibration(calibration) {
        this._calibration = calibration;
        this._camera.calibrate(calibration);
    }

    get usePixelRatio() {
        return this._calibration && this._calibration.usePixelRatio;
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
