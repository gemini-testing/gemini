'use strict';

var inherit = require('inherit'),
    q = require('q'),
    temp = require('temp'),

    Runner = require('./runner'),
    ScreenShooter = require('./screen-shooter'),
    Image = require('./image');

module.exports = inherit(Runner, {

    _beforeAll: function() {
        var _this = this;
        return this._getScreenShooterConfig()
            .then(function(config) {
                _this._shooter = new ScreenShooter(config);
                _this.emit('beginTests');
                return _this._shooter._beforeAll();
            });
    },

    _afterAll: function() {
        this.emit('endTests');
        return this._shooter._afterAll();
    },

    _beforePlan: function(plan) {
        this.emit('beginPlan', plan.name);
        return this._shooter._beforePlan(plan);
    },

    _afterPlan: function(plan) {
        this.emit('endPlan', plan.name);
        return this._shooter._afterPlan(plan);
    },

    _runState: function(plan, state) {
        this.emit('beginTest', state);
        return this._shooter._runState(plan, state)
            .then(this._compareScreenshots.bind(this));
    },

    _compareScreenshots: function (captureData) {
        var prevPath = this.config.getScreenshotPath(captureData.name,
                captureData.state),
            _this = this;
        return Image.compare(captureData.path, prevPath)
            .then(function(isEqual) {
                _this.emit('endTest', {
                    name: captureData.name,
                    state: captureData.state,
                    equal: isEqual,
                    previousPath: prevPath,
                    currentPath: captureData.path
                });
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
    }
});

