'use strict';

const _ = require('lodash');
const StateProcessor = require('./state-processor');
const RunnerEvents = require('../constants/runner-events');
const Image = require('../image');

module.exports = class TestStateProcessor extends StateProcessor {
    constructor(config) {
        super({
            module: require.resolve('./capture-processor/tester'),
            constructorArg: config.system.diffColor
        });

        this._diffColor = config.system.diffColor;
    }

    exec(state, browserSession, page, emit) {
        return super.exec(state, browserSession, page)
            .then((result) => {
                if (!result.equal) {
                    result = this._attachDiffBuilder(result, state, browserSession);
                }

                emit(RunnerEvents.END_TEST, result);
            });
    }

    _attachDiffBuilder(result, state, browserSession) {
        const tolerance = _.isNumber(state.tolerance)
            ? state.tolerance
            : browserSession.browser.config.tolerance;

        return _.extend(result, {
            saveDiffTo: (diffPath) => {
                return Image.buildDiff({
                    reference: result.referencePath,
                    current: result.currentPath,
                    diff: diffPath,
                    diffColor: this._diffColor,
                    tolerance: tolerance
                });
            }
        });
    }
};
