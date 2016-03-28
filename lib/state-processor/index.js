'use strict';

var Tester = require('./capture-processor/tester'),
    ScreenShooter = require('./capture-processor/screen-shooter'),
    ScreenUpdater = require('./capture-processor/screen-updater'),
    StateProcessor = require('./state-processor');

module.exports = {
    createTester: function(config, options) {
        return new StateProcessor(new Tester(config, options));
    },

    createScreenShooter: function(config) {
        return new StateProcessor(new ScreenShooter(config));
    },

    createScreenUpdater: function(config, options) {
        return new StateProcessor(ScreenUpdater.create(config, options));
    }
};
