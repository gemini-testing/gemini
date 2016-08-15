'use strict';

const UpdateStateProcessor = require('./update-state-processor');
const TestStateProcessor = require('./test-state-processor');

module.exports = {
    createTester: function(config) {
        return new TestStateProcessor(config);
    },

    createScreenUpdater: function(options) {
        return new UpdateStateProcessor(options);
    }
};
