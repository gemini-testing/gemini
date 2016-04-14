'use strict';

var Tester = require('./capture-processor/tester'),
    ScreenShooter = require('./capture-processor/screen-shooter'),
    ScreenUpdater = require('./capture-processor/screen-updater'),
    StateProcessor = require('./state-processor');

module.exports = {
    createTester: function(config) {
        return new StateProcessor(new Tester(config.system.diffColor));
    },

    createScreenShooter: function() {
        return new StateProcessor(new ScreenShooter());
    },

    createScreenUpdater: function(options) {
        return new StateProcessor(ScreenUpdater.create(options));
    }
};
