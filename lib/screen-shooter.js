'use strict';

var EventEmitter = require('events').EventEmitter,
    q = require('q'),
    fs = require('q-io/fs'),
    inherit = require('inherit'),
    Browser = require('./browser'),
    elementRect = require('./element-rect');

module.exports = inherit(EventEmitter, {
    __constructor: function (config) {
        this.config = config;
    },

    runPlans: function(plans) {
        return q.all(plans.map(function(plan) {
            return this.runPlan(plan);
        }, this));
    },

    runPlan: function(plan) {
        var _this = this;
        return fs.makeTree(this.config.getScreenshotsDir(plan.name))
            .then(function() {
                return q.all(plan.getStates().map(function(state) {
                    return _this._captureState(plan, state)
                        .then(function(savePath) {
                            _this.emit('endCapture', {
                                name: plan.name,
                                state: state,
                                path: savePath
                            });
                        });
                }));
            });
    },

    _captureState: function(plan, state) {
        var _this = this,
            browser = new Browser();

        this.emit('beginCapture', plan.name, state);

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
            });

    }

});

