'use strict';

var Browser = require('./browser');

module.exports = class ExistingBrowser extends Browser {
    static fromObject(serializedObject) {
        return new ExistingBrowser(
                serializedObject.sessionId,
                serializedObject.config,
                serializedObject.calibration
            )
            .attach();
    }

    constructor(sessionId, config, calibration) {
        super(config);

        this.sessionId = sessionId;
        this._setCalibration(calibration);
    }

    attach() {
        return this._wd.attach(this.sessionId)
            .thenResolve(this);
    }
};
