'use strict';

const StateProcessor = require('./state-processor');
const Events = require('../constants/events');

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
                emit(Events.CAPTURE, result);
                emit(Events.UPDATE_RESULT, result);
            });
    }
};
