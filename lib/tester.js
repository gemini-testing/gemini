var EventEmitter = require('events').EventEmitter,
    path = require('path'),
    inherit = require('inherit'),
    q = require('q'),
    temp = require('temp'),
    Runner = require('./runner'),
    Image = require('./image');

module.exports = inherit(EventEmitter, {

    __constructor: function(config) {
        this.config = config;
    },

    runTest: function(shooter) {
        var _this = this;
        this._getRunnerConfig()
            .then(function(config) {
                return new Runner(config);
            })
            .then(function(runner) {
                runner.on('screenshot', _this._compareScreenshots.bind(_this));
                return runner.runTest(shooter);
            });
    },

    _getRunnerConfig: function() {
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

    _compareScreenshots: function (name, state, file) {
        var prevPath = this.config.getScreenshotPath(name, state),
            _this = this;
        Image.compare(file, prevPath)
            .then(function(isEqual) {
                _this.emit('test', {
                    name: name,
                    state: state,
                    equal: isEqual,
                    previousPath: prevPath,
                    currentPath: file
                });
            });
    }

});
