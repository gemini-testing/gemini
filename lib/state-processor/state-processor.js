'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const workerFarm = require('worker-farm');

const temp = require('../temp');
const Events = require('../constants/events');
const errorUtils = require('../errors/utils');

module.exports = class StateProcessor {
    constructor(captureProcessorInfo) {
        this._captureProcessorInfo = captureProcessorInfo;
    }

    prepare(emitter) {
        this._workers = workerFarm(require.resolve('./job'));
        emitter.on(Events.END, () => workerFarm.end(this._workers));
    }

    exec(state, browserSession, page) {
        const coverage = page.coverage;
        const browserConfig = browserSession.browser.config;
        const tolerance = _.isNumber(state.tolerance)
            ? state.tolerance
            : browserConfig.tolerance;

        const jobArgs = {
            captureProcessorInfo: this._captureProcessorInfo,
            browserSession: browserSession.serialize(),
            page: _.omit(page, 'coverage'),
            execOpts: {
                pixelRatio: page.pixelRatio,
                refPath: browserConfig.getScreenshotPath(state.suite, state.name),
                ignoreAntialiasing: true,
                tolerance
            },
            temp: temp.serialize()
        };

        return Promise.fromCallback((cb) => this._workers(jobArgs, cb))
            .catch(err => Promise.reject(errorUtils.fromPlainObject(err)))
            .then(result => _.extend(result, {coverage, tolerance}));
    }
};
