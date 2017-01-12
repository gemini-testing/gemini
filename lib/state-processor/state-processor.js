'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const workerFarm = require('worker-farm');

const temp = require('../temp');
const Events = require('../constants/events');
const errorUtils = require('../errors/utils');

module.exports = class StateProcessor {
    constructor(captureProcessorType) {
        this._captureProcessorType = captureProcessorType;
    }

    prepare(emitter) {
        this._workers = workerFarm(require.resolve('./job'));
        emitter.on(Events.END, () => workerFarm.end(this._workers));
    }

    exec(state, browserSession, page) {
        const coverage = page.coverage;
        const tolerance = _.isNumber(state.tolerance)
            ? state.tolerance
            : browserSession.browser.config.tolerance;

        const jobArgs = {
            captureProcessorType: this._captureProcessorType,
            browserSession: browserSession.serialize(),
            page: _.omit(page, 'coverage'),
            execOpts: {
                pixelRatio: page.pixelRatio,
                referencePath: browserSession.browser.config.getScreenshotPath(state.suite, state.name),
                tolerance
            },
            temp: temp.serialize()
        };

        return Promise.fromCallback((cb) => this._workers(jobArgs, cb))
            .catch(err => Promise.reject(errorUtils.fromPlainObject(err)))
            .then(result => _.extend(result, {coverage, tolerance}));
    }
};
