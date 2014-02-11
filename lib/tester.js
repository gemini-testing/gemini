'use strict';

var EventEmitter = require('events').EventEmitter,

    inherit = require('inherit'),
    q = require('q'),
    temp = require('temp'),

    ScreenShooter = require('./screen-shooter'),
    Image = require('./image');

module.exports = inherit(EventEmitter, {

    __constructor: function(config) {
        this.config = config;
    },

    runTest: function(plan) {
        var _this = this;
        this.emit('beginPlan', plan.name);
        return this._getScreenShooterConfig()
            .then(function(config) {
                return new ScreenShooter(config);
            })
            .then(function(shooter) {
                shooter.on('beginCapture', function(name, state) {
                    _this.emit('beginTest', state);
                });

                shooter.on('endCapture', _this._compareScreenshots.bind(_this));
                return shooter.runPlan(plan);
            })
            .then(function() {
                _this.emit('endPlan', plan.name);
            });
    },

    _getScreenShooterConfig: function() {
        var d = q.defer(),
            _this = this;
        temp.mkdir('shooter', function(error, dir) {
            if (error) {
                return d.reject(error);
            }
            var config = Object.create(_this.config);
            config.screenshotsDir = dir;
            d.resolve(config);
        });
        return d.promise;
    },

    _compareScreenshots: function (captureData) {
        var prevPath = this.config.getScreenshotPath(captureData.name,
                captureData.state),
            _this = this;
        Image.compare(captureData.path, prevPath)
            .then(function(isEqual) {
                _this.emit('endTest', {
                    name: captureData.name,
                    state: captureData.state,
                    equal: isEqual,
                    previousPath: prevPath,
                    currentPath: captureData.path
                });
            });
    }

});
