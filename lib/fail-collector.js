'use strict';

var q = require('q'),
    format = require('util').format,
    inherit = require('inherit'),
    _ = require('lodash'),
    EventEmitter = require('events').EventEmitter,
    RunnerEvents = require('./constants/runner-events'),
    NoRefImageError = require('./errors/no-ref-image-error');

var FailCollector = inherit(EventEmitter, {
    __constructor: function(config) {
        this._config = config;
        this._retriesPerformed = 0;
        this._failedSuites = {};
    },

    tryToSubmitCapture: function(candidate) {
        if (!candidate.hasOwnProperty('equal') || candidate.equal === true) {
            return false;
        }
        return this.tryToSubmitError(candidate);
    },

    tryToSubmitError: function(candidate) {
        if (candidate instanceof NoRefImageError) {
            return false;
        }

        FailCollector._validate(candidate);

        if (this._isNeedToSubmit(candidate)) {
            this._submitForRetry(candidate);
            return true;
        }
        return false;
    },

    retry: function(retryFunc) {
        var failedSuites = this._flatFailedSuites();

        this._failedSuites = {};
        this._retriesPerformed++;

        return failedSuites.length
            ? retryFunc(failedSuites)
            : q.resolve();
    },

    _validate: function(retryCandidate) {
        ['suite', 'browserId'].forEach(function(requiredField) {
            if (!retryCandidate[requiredField]) {
                throw new Error(format('Retry attempt failed. Missing required data: %s', requiredField));
            }
        });
    },

    _isNeedToSubmit: function(candidate) {
        var retries = this._config.forBrowser(candidate.browserId).retry;

        return retries > this._retriesPerformed;
    },

    _submitForRetry: function(candidate) {
        var suite = candidate.suite,
            suiteInfo = this._failedSuites[suite.fullName];

        if (!suiteInfo) {
            this._failedSuites[suite.fullName] = {
                suite: suite,
                browsers: [candidate.browserId]
            };
        } else {
            suiteInfo.browsers = _.union(suiteInfo.browsers, [candidate.browserId]);
        }

        this._emitRetry(candidate);
    },

    _emitRetry: function(candidate) {
        this.emit(RunnerEvents.RETRY, _.extend(candidate, {
            attempt: this._retriesPerformed,
            retriesLeft: this._config.forBrowser(candidate.browserId).retry - this._retriesPerformed
        }));
    },

    _flatFailedSuites: function() {
        return _.map(this._failedSuites, function(failedSuiteInfo) {
            return _.extend(failedSuiteInfo.suite, {
                browsers: failedSuiteInfo.browsers
            });
        });
    }
}, {
    _validate: function(retryCandidate) {
        ['suite', 'browserId'].forEach(function(requiredField) {
            if (!retryCandidate[requiredField]) {
                throw new Error(format('Retry attempt failed. Missing required data: %s', requiredField));
            }
        });
    }
});

module.exports = FailCollector;
