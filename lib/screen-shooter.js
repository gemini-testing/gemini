'use strict';

var fs = require('q-io/fs'),
    inherit = require('inherit'),
    Runner = require('./runner');

module.exports = inherit(Runner, {

    _processCapture: function(capture) {
        var _this = this,
            savePath = _this.config.getScreenshotPath(capture.suite, capture.state.name, capture.browser.id);

        //TODO: create directories only once
        return fs.makeTree(_this.config.getScreenshotsDir(capture.suite, capture.state.name))
            .then(function() {
                return capture.image.save(savePath);
            })
            .then(function() {
                var data = {
                    suiteName: capture.suite.name,
                    suiteId: capture.suite.id,
                    stateName: capture.state.name,
                    suitePath: capture.suite.path,
                    imagePath: savePath,
                    browserId: capture.browser.id
                };
                _this._stats.add('gathered');
                _this.emit('capture', data);
                return data;
            });
    }

});
