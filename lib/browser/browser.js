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
            config: _.pick(this.config, ['id', 'gridUrl']),
            sessionId: this.sessionId,
            calibration: this._calibration
        };
    }

    _setCalibration(calibration) {
        this._calibration = calibration;
        this._camera.calibrate(calibration);
    }
};
