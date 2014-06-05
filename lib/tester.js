'use strict';

var inherit = require('inherit'),
    q = require('q'),
    temp = require('temp'),

    Runner = require('./runner'),
    Image = require('./image'),

    mktemp = q.nbind(temp.mkdir, temp);

temp.track();

module.exports = inherit(Runner, {

    _prepare: function() {
        var _this = this;
        return mktemp('gemini').then(function(dir) {
            _this._tempDir = dir;
        });
    },

    _processCapture: function(capture) {
        var refPath = this.config.getScreenshotPath(
                capture.suite,
                capture.state.name,
                capture.browser.name),
            _this = this;

        return capture.image.save(this._tempPath())
            .then(function(path) {
                return [path, Image.compare(path, refPath)];
            })
            .spread(function(currentPath, isEqual) {
                _this.emit('endTest', {
                    suiteName: capture.suite.name,
                    stateName: capture.state.name,
                    equal: isEqual,
                    referencePath: refPath,
                    currentPath: currentPath,
                    browserId: capture.browser.name
                });
            });
    },

    _tempPath: function() {
        return temp.path({dir: this._tempDir, suffix: '.png'});
    },

});
