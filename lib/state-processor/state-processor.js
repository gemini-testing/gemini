'use strict';

const _ = require('lodash');
const q = require('q');
const workerFarm = require('worker-farm');

const temp = require('../temp');
const RunnerEvents = require('../constants/runner-events');
const errorUtils = require('../errors/utils');

module.exports = class StateProcessor {
    constructor(captureProcessorInfo) {
        this._captureProcessorInfo = captureProcessorInfo;
    }

    prepare(emitter) {
        this._workers = workerFarm(require.resolve('./job'));
        emitter.on(RunnerEvents.END, () => workerFarm.end(this._workers));
    }

    exec(state, browserSession, page) {
        const coverage = page.coverage;
        const tolerance = _.isNumber(state.tolerance)
            ? state.tolerance
            : browserSession.browser.config.tolerance;

        const jobArgs = {
            captureProcessorInfo: this._captureProcessorInfo,
            browserSession: browserSession.serialize(),
            page: _.omit(page, 'coverage'),
            execOpts: {
                pixelRatio: page.pixelRatio,
                refPath: browserSession.browser.config.getScreenshotPath(state.suite, state.name),
                tolerance
            },
            temp: temp.serialize()
        };

        return q.nfcall(this._workers, jobArgs)
            .catch(err => q.reject(errorUtils.fromPlainObject(err)))
            .then(result => _.extend(result, {coverage, tolerance}));
    }
};
