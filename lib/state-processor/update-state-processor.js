'use strict';

const StateProcessor = require('./state-processor');
const RunnerEvents = require('../constants/runner-events');

module.exports = class UpdateStateProcessor extends StateProcessor {
    constructor(options) {
        super({
            module: require.resolve('./capture-processor/screen-updater'),
            constructorArg: options
        });
    }

    exec(state, browserSession, page, emit) {
        return super.exec(state, browserSession, page)
            .then((result) => {
                emit(RunnerEvents.CAPTURE, result);
                emit(RunnerEvents.END_CAPTURE, result);
            });
    }
};
