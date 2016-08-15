'use strict';

var _ = require('lodash'),
    q = require('q'),
    workerFarm = require('worker-farm'),
    temp = require('../temp'),
    RunnerEvents = require('../constants/runner-events'),
    errorUtils = require('../errors/utils');

module.exports = class StateProcessor {
    constructor(captureProcessorInfo) {
        this._captureProcessorInfo = captureProcessorInfo;
    }

    prepare(emitter) {
        this._workers = workerFarm(require.resolve('./job'));
        emitter.on(RunnerEvents.END, () => workerFarm.end(this._workers));
    }

    exec(state, browserSession, page) {
        var coverage = page.coverage,
            jobArgs = {
                captureProcessorInfo: this._captureProcessorInfo,
                browserSession: browserSession.serialize(),
                page: _.omit(page, 'coverage'),
                execOpts: {
                    pixelRatio: page.pixelRatio,
                    refPath: browserSession.browser.config.getScreenshotPath(state.suite, state.name),
                    tolerance: _.isNumber(state.tolerance)
                        ? state.tolerance
                        : browserSession.browser.config.tolerance
                },
                temp: temp.serialize()
            };

        return q.nfcall(this._workers, jobArgs)
            .fail(err => q.reject(errorUtils.fromPlainObject(err)))
            .then(result => _.extend(result, {coverage}));
    }
};
