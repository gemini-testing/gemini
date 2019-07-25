'use strict';

const _ = require('lodash');

const StateProcessor = require('./state-processor');
const Events = require('../constants/events');
const {Image} = require('gemini-core');

module.exports = class TestStateProcessor extends StateProcessor {
    constructor(config) {
        super('tester', config.system.workers);

        this._diffColor = config.system.diffColor;
    }

    exec(state, browserSession, page, emit) {
        return super.exec(state, browserSession, page)
            .then((result) => {
                if (!result.equal) {
                    const {buildDiffOpts, antialiasingTolerance} = browserSession.browser.config;
                    result = this._attachDiffBuilder(result, {buildDiffOpts, antialiasingTolerance});
                }

                emit(Events.TEST_RESULT, result);
            });
    }

    _attachDiffBuilder(result, {buildDiffOpts, antialiasingTolerance}) {
        return _.extend(result, {
            saveDiffTo: (diffPath) => Image.buildDiff({
                reference: result.refImg.path,
                current: result.currImg.path,
                diff: diffPath,
                diffColor: this._diffColor,
                tolerance: result.tolerance,
                antialiasingTolerance,
                ...buildDiffOpts
            })
        });
    }
};
