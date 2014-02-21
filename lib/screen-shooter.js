'use strict';

var fs = require('q-io/fs'),
    inherit = require('inherit'),
    Runner = require('./runner');

module.exports = inherit(Runner, {

    _beforeState: function(state) {
        return fs.makeTree(this.config.getScreenshotsDir(state.plan.name, state.name));
    },

    _runStateInBrowser: function(state, browser) {
        var _this = this;

        this.emit('beginCapture', state.plan.name, state.name);
        return browser.captureState(state)
            .then(function(image) {
                var savePath = _this.config.getScreenshotPath(state.plan.name, state.name, browser.name);
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
                    plan: state.plan.name,
                    state: state.name,
                    path: savePath,
                    browser: browser.name
                };
                _this.emit('endCapture', data);
                return data;

            });
    },
});

