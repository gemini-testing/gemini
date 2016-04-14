'use strict';

var StateProcessor = require('./state-processor'),
    RunnerEvents = require('../constants/runner-events');

function create(captureProcessorName, jobDoneEvent, constructorArgs) {
    return new StateProcessor({
            module: require.resolve('./capture-processor/' + captureProcessorName),
            constructorArgs
        }, jobDoneEvent);
}

module.exports = {
    createTester: function(config) {
        return create('tester', RunnerEvents.END_TEST, config.system.diffColor);
    },

    createScreenShooter: function() {
        return create('screen-shooter', RunnerEvents.CAPTURE);
    },

    createScreenUpdater: function(options) {
        return create('screen-updater', RunnerEvents.CAPTURE, options);
    }
};
