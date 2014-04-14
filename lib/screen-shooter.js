'use strict';

var fs = require('q-io/fs'),
    inherit = require('inherit'),
    Runner = require('./runner');

module.exports = inherit(Runner, {

    _processCapture: function(capture) {
        var _this = this,
            savePath = _this.config.getScreenshotPath(capture.plan.name, capture.state.name, capture.browser.fullName);

        //TODO: create directories only once
        return fs.makeTree(_this.config.getScreenshotsDir(capture.plan.name, capture.state.name))
            .then(function() {
                return capture.image.save(savePath);
            })
            .then(function(savePath) {
                var data = {
                    planName: capture.plan.name,
                    stateName: capture.state.name,
                    imagePath: savePath,
                    browserName: capture.browser.fullName
                };
                _this.emit('capture', data);
                return data;
            });
    }

});
