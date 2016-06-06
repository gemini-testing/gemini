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

    captureFullscreenImage(pageDisposition) {
        return this._camera.captureFullscreenImage(pageDisposition);
    }

    serialize() {
        return {
            config: _.pick(this.config, ['id', 'gridUrl', 'httpTimeout', 'screenshotMode']),
            sessionId: this.sessionId,
            calibration: this._calibration
        };
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
