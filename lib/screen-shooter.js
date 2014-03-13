'use strict';

var inherit = require('inherit'),
    Runner = require('./runner');

module.exports = inherit(Runner, {

    _processCapture: function(capture) {
        var _this = this,
            savePath = _this.config.getScreenshotPath(capture.plan.name, capture.state.name, capture.browser.name);
        return capture.image.save(savePath)
            .then(function(savePath) {
                var data = {
                    planName: capture.plan.name,
                    stateName: capture.state.name,
                    imagePath: savePath,
                    browserName: capture.browser.name
                };
                _this.emit('capture', data);
                return data;
            });
    }

});

