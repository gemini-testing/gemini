'use strict';

const Browser = require('./browser');
const bluebirdQ = require('bluebird-q');

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
        return this._setHttpTimeout()
            .then(() => bluebirdQ(this._wd.attach(this.sessionId)))
            .thenReturn(this);
    }
};
