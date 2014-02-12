'use strict';

var fs = require('q-io/fs'),
    inherit = require('inherit'),
    Browser = require('./browser'),
    Runner = require('./runner'),
    elementRect = require('./element-rect');

module.exports = inherit(Runner, {

    _beforePlan: function(plan) {
        return fs.makeTree(this.config.getScreenshotsDir(plan.name));
    },

    _runState: function(plan, state) {
        var _this = this,
            browser = new Browser();

        this.emit('beginCapture', plan, state);
        return browser.open(this.config.getAbsoluteUrl(plan.url))
            .then(function() {
                return browser.findElement(plan.selector);
            })
            .then(function(element) {
                return plan.toState(state, element, this._browser)
                    .then(function() {
                        return browser.takeScreenshot();
                    })
                    .then(function(image) {
                        return elementRect.get(element)
                            .then(function(rect) {
                                return image.crop(rect);
                            });
                    });
            })
            .then(function(image) {
                var savePath = _this.config.getScreenshotPath(plan.name, state);
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
                    path: savePath
                };
                _this.emit('endCapture', data);
                return data;

            });
    },
});

