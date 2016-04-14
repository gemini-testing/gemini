'use strict';

var inherit = require('inherit'),
    _ = require('lodash'),
    q = require('q'),
    job = require('./job');

module.exports = inherit({
    __constructor: function(captureProcessorInfo, jobDoneEvent) {
        this._captureProcessorInfo = captureProcessorInfo;
        this.jobDoneEvent = jobDoneEvent;
    },

    prepare: function(emitter) {
        return q();
    },

    exec: function(state, browserSession, pageDisposition) {
        var jobArgs = {
                captureProcessorInfo: this._captureProcessorInfo,
                browserSession: browserSession.serialize(),
                pageDisposition: pageDisposition,
                execOpts: {
                    refPath: browserSession.browser.config.getScreenshotPath(state.suite, state.name),
                    tolerance: _.isNumber(state.tolerance)
                        ? state.tolerance
                        : browserSession.browser.config.tolerance
                }
            };

        return job(jobArgs);
    }
});
