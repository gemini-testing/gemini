'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const workerFarm = require('worker-farm');

const {temp} = require('gemini-core');
const Events = require('../constants/events');
const errorUtils = require('../errors/utils');

module.exports = class StateProcessor {
    constructor(captureProcessorType, maxConcurrentWorkers) {
        this._captureProcessorType = captureProcessorType;
        this._maxConcurrentWorkers = maxConcurrentWorkers;
    }

    prepare(emitter) {
        const workerFarmConfig = {
            maxConcurrentWorkers: this._maxConcurrentWorkers
        };
        this._workers = workerFarm(workerFarmConfig, require.resolve('./job'));
        emitter.on(Events.END, () => workerFarm.end(this._workers));
    }

    exec(state, browserSession, page) {
        const browserConfig = browserSession.browser.config;
        const coverage = page.coverage;
        const tolerance = _.isNumber(state.tolerance)
            ? state.tolerance
            : browserConfig.tolerance;

        const jobArgs = {
            captureProcessorType: this._captureProcessorType,
            browserSession: browserSession.serialize(),
            page: _.omit(page, 'coverage'),
            execOpts: {
                refImg: {path: browserConfig.getScreenshotPath(state.suite, state.name), size: null},
                pixelRatio: page.pixelRatio,
                antialiasingTolerance: browserConfig.antialiasingTolerance,
                tolerance,
                compareOpts: browserConfig.compareOpts
            },
            temp: temp.serialize()
        };

        return Promise.fromCallback((cb) => this._workers(jobArgs, cb))
            .catch(err => Promise.reject(errorUtils.fromPlainObject(err)))
            .then(result => _.extend(result, {coverage, tolerance}));
    }
};
