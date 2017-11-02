'use strict';

const StateProcessor = require('./state-processor');
const Events = require('../constants/events');

module.exports = class UpdateStateProcessor extends StateProcessor {
    constructor(opts) {
        const updaterType = opts.diff && !opts.new && 'diff-updater'
            || !opts.diff && opts.new && 'new-updater'
            || 'meta-updater';

        super(updaterType);
    }

    exec(state, browserSession, page, emit) {
        return super.exec(state, browserSession, page)
            .then((result) => {
                emit(Events.UPDATE_RESULT, result);
            });
    }
};
