'use strict';

var fs = require('q-io/fs'),
    inherit = require('inherit'),
    Runner = require('./runner');

module.exports = inherit(Runner, {

    _beforeState: function(plan, state) {
        return fs.makeTree(this.config.getScreenshotsDir(plan.name, state));
    },

    _runStateInBrowser: function(plan, state, browser) {
        var _this = this;

        this.emit('beginCapture', plan, state);
        return browser.captureState(plan, state)
            .then(function(image) {
                var savePath = _this.config.getScreenshotPath(plan.name, state, browser.name);
                return image.save(savePath).then(function() {
                    return savePath;
                });
            })
            .then(function(savePath) {
                return browser.quit().then(function() {
                    return savePath;
                });
            })
            .then(function(savePath) {
                var data = {
                    name: plan.name,
                    state: state,
                    path: savePath,
                    browser: browser.name
                };
                _this.emit('endCapture', data);
                return data;

            });
    },
});

