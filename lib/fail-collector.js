'use strict';

const q = require('q');
const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const RunnerEvents = require('./constants/runner-events');
const NoRefImageError = require('./errors/no-ref-image-error');

module.exports = class FailCollector extends EventEmitter {
    constructor(config) {
        super();

        this._config = config;
        this._retriesPerformed = 0;
        this._failedTests = [];
    }

    tryToSubmitStateResult(candidate) {
        if (!candidate.hasOwnProperty('equal') || candidate.equal === true) {
            return false;
        }
        return this.tryToSubmitError(candidate);
    }

    tryToSubmitError(candidate) {
        if (candidate instanceof NoRefImageError) {
            return false;
        }

        FailCollector._validate(candidate);

        if (this._isNeedToSubmit(candidate)) {
            this._submitForRetry(candidate);
            return true;
        }
        return false;
    }

    retry(retryFunc, suiteCollection) {
        if (this._failedTests.length === 0) {
            return q();
        }

        suiteCollection.disableAll();

        this._failedTests.forEach((stateInfo) => {
            suiteCollection.enable(stateInfo.suiteName, {
                state: stateInfo.stateName,
                browser: stateInfo.browserId
            });
        });

        this._failedTests = [];
        this._retriesPerformed++;

        return retryFunc(suiteCollection);
    }

    _isNeedToSubmit(candidate) {
        const retries = this._config.forBrowser(candidate.browserId).retry;

        return retries > this._retriesPerformed;
    }

    _submitForRetry(candidate) {
        this._failedTests.push({
            suiteName: candidate.suite.fullName,
            stateName: candidate.state.name,
            browserId: candidate.browserId
        });

        this._emitRetry(candidate);
    }

    _emitRetry(candidate) {
        this.emit(RunnerEvents.RETRY, _.extend(candidate, {
            attempt: this._retriesPerformed,
            retriesLeft: this._config.forBrowser(candidate.browserId).retry - this._retriesPerformed
        }));
    }

    static _validate(retryCandidate) {
        ['suite', 'state', 'browserId'].forEach((requiredField) => {
            if (!retryCandidate[requiredField]) {
                throw new Error(`Retry attempt failed. Missing required data: ${requiredField}`);
            }
        });
    }
};
