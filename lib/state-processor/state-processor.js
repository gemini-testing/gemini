'use strict';

var _ = require('lodash'),
    q = require('q'),
    workerFarm = require('worker-farm'),
    temp = require('../temp'),
    RunnerEvents = require('../constants/runner-events'),
    errorUtils = require('../errors/utils');

module.exports = class StateProcessor {
    constructor(captureProcessorInfo, jobDoneEvent) {
        this._captureProcessorInfo = captureProcessorInfo;
        this._captureProcessor = require(captureProcessorInfo.module)
            .create(captureProcessorInfo.constructorArg);

        this.jobDoneEvent = jobDoneEvent;
    }

    prepare(emitter) {
        this._workers = workerFarm(require.resolve('./job'));
        emitter.on(RunnerEvents.END, () => workerFarm.end(this._workers));
    }

    exec(state, browserSession, pageDisposition) {
        var coverage = pageDisposition.coverage,
            jobArgs = {
                captureProcessorInfo: this._captureProcessorInfo,
                browserSession: browserSession.serialize(),
                pageDisposition: _.omit(pageDisposition, 'coverage'),
                execOpts: {
                    refPath: browserSession.browser.config.getScreenshotPath(state.suite, state.name),
                    tolerance: _.isNumber(state.tolerance)
                        ? state.tolerance
                        : browserSession.browser.config.tolerance
                },
                temp: temp.serialize()
            };

        return q.nfcall(this._workers, jobArgs)
            .fail(err => q.reject(errorUtils.fromPlainObject(err)))
            .then(result => {
                result.coverage = coverage;
                return this._captureProcessor.postprocessResult(result, jobArgs.execOpts);
            });
    }
};
