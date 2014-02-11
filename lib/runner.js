var EventEmitter = require('events').EventEmitter,
    path = require('path'),
    q = require('q'),
    fs = require('q-io/fs'),
    inherit = require('inherit'),
    Browser = require('./browser'),
    elementRect = require('./element-rect');

var Runner = module.exports = inherit(EventEmitter, {
    __constructor: function (config) {
        this.config = config;

    },

    runTests: function(shooters) {
        return q.all(shoters.map(function(shooter) {
            return this.runTest(shooter);
        }, this));
    },

    runTest: function(shooter) {
        var _this = this;
        return fs.makeTree(this.config.getScreenshotsDir(shooter.name))
            .then(function() {
                return q.all(shooter.getStates().map(function(state) {
                    return _this._captureState(shooter, state)
                        .then(function(savePath) {
                            _this.emit('screenshot', shooter.name, state, savePath);
                        });
                }));
            });
    },

    _captureState: function(shooter, state) {
        var _this = this,
            browser = new Browser();
        return browser.open(this.config.getAbsoluteUrl(shooter.url))
            .then(function() {
                return browser.findElement(shooter.selector);
            })
            .then(function(element) {
                return shooter.toState(state, element, this._browser)
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
                var savePath = _this.config.getScreenshotPath(shooter.name, state);
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

